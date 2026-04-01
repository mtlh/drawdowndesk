"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Line,
  ReferenceLine,
} from "recharts";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import {
  FlameKindling,
  Target,
  TrendingUp,
  Wallet,
  Clock,
  CheckCircle2,
  Calculator,
} from "lucide-react";
import { useQuery } from "convex/react";
import { AuthRequired } from "@/hooks/useRequireAuth";
import { api } from "../../../convex/_generated/api";
import { getPriceInPounds } from "@/lib/utils";
import { SkeletonCard, SkeletonChart } from "@/components/ui/skeleton";
import { useFireMetrics } from "@/context/FireMetricsContext";

// ─── localStorage key ──────────────────────────────────────────────────────────
const STORAGE_KEY = "fireMetrics";

// ─── Defaults ─────────────────────────────────────────────────────────────────
const DEFAULTS = {
  annualSavings: 20000,   // predicted annual savings £
  nominalReturn: 7,       // nominal return % (nominal)
  inflationRate: 2.5,     // inflation % per year
  annualExpenses: 30000,  // annual expenditure in retirement £
  currentAge: 30,         // current age
};

type StorageShape = typeof DEFAULTS;

function loadFromStorage(): StorageShape {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        annualSavings: parsed.annualSavings ?? parsed.effectiveAnnualSavings ?? parsed.manualAnnualSavings ?? DEFAULTS.annualSavings,
        nominalReturn: parsed.nominalReturn ?? parsed.realReturn ?? parsed.expectedReturn ?? DEFAULTS.nominalReturn,
        inflationRate: parsed.inflationRate ?? DEFAULTS.inflationRate,
        annualExpenses: parsed.annualExpenses ?? DEFAULTS.annualExpenses,
        currentAge: parsed.currentAge ?? DEFAULTS.currentAge,
      } as StorageShape;
    }
  } catch {
    // ignore parse errors
  }
  return DEFAULTS;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Compound growth: project portfolio value at N years from now */
function projectAtAge(
  startingBalance: number,
  annualContribution: number,
  annualRate: number,
  yearsFromNow: number
): number {
  if (yearsFromNow <= 0) return startingBalance;
  if (annualRate === 0) return startingBalance + annualContribution * yearsFromNow;
  const compound = Math.pow(1 + annualRate, yearsFromNow);
  const annuity = (compound - 1) / annualRate;
  return startingBalance * compound + annualContribution * annuity;
}

/**
 * Solve compound growth for n:
 *   FV = NW × (1+r)^n + A × ((1+r)^n - 1) / r
 *   → n = ln((FV×r + A) / (NW×r + A)) / ln(1+r)
 */
function solveYearsToTarget(
  target: number,
  startingBalance: number,
  annualContribution: number,
  annualRate: number
): number {
  if (startingBalance >= target) return 0;
  if (annualContribution <= 0 && annualRate <= 0) return Infinity;

  if (annualRate === 0) {
    return annualContribution > 0
      ? (target - startingBalance) / annualContribution
      : Infinity;
  }

  const numerator = target * annualRate + annualContribution;
  const denominator = startingBalance * annualRate + annualContribution;

  if (denominator <= 0 || numerator <= denominator) return Infinity;

  return Math.max(0, Math.log(numerator / denominator) / Math.log(1 + annualRate));
}

/** Format a portfolio value: shows £X.Xm when ≥ £1M, £XXk otherwise */
function formatPortfolioValue(value: number): string {
  if (value >= 1_000_000) {
    return `£${(value / 1_000_000).toFixed(1)}m`;
  }
  return `£${(value / 1_000).toFixed(0)}k`;
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function FireMetricsPage() {
  const { setFiPercent } = useFireMetrics();

  const getAccountsData = useQuery(api.accounts.accountCrud.getUserAccounts);
  const getUserPortfolio = useQuery(api.portfolio.getUserPortfolio.getUserPortfolio);

  // ── State ────────────────────────────────────────────────────────────────────
  const [annualSavings, setAnnualSavings] = useState(DEFAULTS.annualSavings);
  const [nominalReturn, setNominalReturn] = useState(DEFAULTS.nominalReturn);
  const [inflationRate, setInflationRate] = useState(DEFAULTS.inflationRate);
  const [annualExpenses, setAnnualExpenses] = useState(DEFAULTS.annualExpenses);
  const [currentAge, setCurrentAge] = useState(DEFAULTS.currentAge);
  const [mounted, setMounted] = useState(false);

  // ── Load from localStorage ──────────────────────────────────────────────────
  useEffect(() => {
    setMounted(true);
    const stored = loadFromStorage();
    setAnnualSavings(stored.annualSavings);
    setNominalReturn(stored.nominalReturn);
    setInflationRate(stored.inflationRate);
    setAnnualExpenses(stored.annualExpenses);
    setCurrentAge(stored.currentAge);
  }, []);

  // ── Persist to localStorage ─────────────────────────────────────────────────
  useEffect(() => {
    if (!mounted) return;
    if (typeof window === "undefined") return;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ annualSavings, nominalReturn, inflationRate, annualExpenses, currentAge })
    );
  }, [annualSavings, nominalReturn, inflationRate, annualExpenses, currentAge, mounted]);

  // ── Live net worth ──────────────────────────────────────────────────────────
  const liveNetWorth = useMemo(() => {
    let total = 0;

    if (getAccountsData && !("error" in getAccountsData)) {
      for (const account of getAccountsData.accounts) {
        total += account.value ?? 0;
      }
    }

    if (getUserPortfolio && !("error" in getUserPortfolio)) {
      for (const portfolio of getUserPortfolio) {
        for (const holding of portfolio.holdings ?? []) {
          const currency = holding.currency ?? "GBP";
          const value = (holding.shares ?? 0) * (holding.currentPrice ?? 0);
          total += getPriceInPounds(value, currency);
        }
        for (const sh of portfolio.simpleHoldings ?? []) {
          total += sh.value ?? 0;
        }
      }
    }

    return total;
  }, [getAccountsData, getUserPortfolio]);

  // ── FIRE calculations ──────────────────────────────────────────────────────
  const r = nominalReturn / 100;
  const inf = inflationRate / 100;
  const SWR_RATE = 0.04; // 4% safe withdrawal rate (the "4% rule")
  const ACCUMULATION_YEARS = 25; // fixed horizon for inflation scaling

  // FIRE number = expenses ÷ 4% × inflation over a standard 25-year accumulation
  const fireNumberBase = SWR_RATE > 0 ? annualExpenses / SWR_RATE : 0;
  const fireNumber = fireNumberBase * Math.pow(1 + inf, ACCUMULATION_YEARS);

  // Years to FIRE (informational only — does NOT affect fireNumber)
  const yearsToFire = solveYearsToTarget(fireNumberBase, liveNetWorth, annualSavings, r);

  // FI progress vs FIRE number
  const fiProgress = fireNumber > 0 ? Math.min(100, (liveNetWorth / fireNumber) * 100) : 0;

  // ── Projection data (year by year from current age to retirement age + 10) ───
  interface ProjectionPoint {
    age: number;
    portfolioValue: number;
    fireTarget: number;
    isFired: boolean;
  }

  const projectionData = useMemo((): ProjectionPoint[] => {
    const data: ProjectionPoint[] = [];
    // Solve for when the portfolio actually reaches fireNumber (inflated target),
    // since the chart threshold is fireNumber, not fireNumberBase.
    const yearsToFireInflated = solveYearsToTarget(fireNumber, liveNetWorth, annualSavings, r);
    const maxAge = Math.min(Math.round(yearsToFireInflated + currentAge) + 5, 100);
    let portfolioValue = liveNetWorth;

    for (let age = currentAge; age <= maxAge; age++) {
      data.push({
        age,
        portfolioValue: Math.round(portfolioValue),
        fireTarget: Math.round(fireNumber),
        isFired: portfolioValue >= fireNumber,
      });
      // project forward by 1 year
      portfolioValue = portfolioValue * (1 + r) + annualSavings;
    }

    return data;
  }, [currentAge, yearsToFire, liveNetWorth, fireNumber, r, annualSavings]);

  // ── Milestone cards (every 5 years from current age) ────────────────────────
  interface Milestone {
    age: number;
    label: string;
    projectedValue: number;
    percentFunded: number;
  }

  const milestones = useMemo((): Milestone[] => {
    const results: Milestone[] = [];
    const fireAge = Math.round(yearsToFire + currentAge);
    const maxAge = Math.min(Math.round(yearsToFire + currentAge) + 5, 100); // 5 years past FIRE, capped at 100

    // Build a set of ages already covered by 5-year steps
    const fiveYearSteps = new Set<number>();
    for (let age = currentAge; age <= maxAge; age += 5) {
      fiveYearSteps.add(age);
    }

    // Add the FIRE age milestone if it falls between 5-year steps
    if (!fiveYearSteps.has(fireAge)) {
      results.push({
        age: fireAge,
        label: `FIRE (${fireAge})`,
        projectedValue: Math.round(projectAtAge(liveNetWorth, annualSavings, r, yearsToFire) * Math.pow(1 + inf, yearsToFire)),
        percentFunded: 100,
      });
    }

    // Add all 5-year milestones — inflated portfolio values vs inflated FIRE target
    for (let age = currentAge; age <= maxAge; age += 5) {
      const yearsFromNow = age - currentAge;
      const nominalValue = projectAtAge(liveNetWorth, annualSavings, r, yearsFromNow);
      const inflatedValue = nominalValue * Math.pow(1 + inf, yearsFromNow);
      const percentFunded = fireNumber > 0 ? (inflatedValue / fireNumber) * 100 : 0;
      results.push({
        age,
        label: age === currentAge ? "Today" : `Age ${age}`,
        projectedValue: Math.round(inflatedValue),
        percentFunded: Math.round(percentFunded),
      });
    }


    return results
      .sort((a, b) => a.age - b.age)
      .slice(0, 12);
  }, [currentAge, yearsToFire, liveNetWorth, annualSavings, r, fireNumber]);

  // ── Chart config ─────────────────────────────────────────────────────────────
  const chartConfig = {
    portfolioValue: {
      label: "Portfolio Value",
      color: "hsl(var(--chart-1))",
    },
    fireTarget: {
      label: "FIRE Number",
      color: "hsl(var(--chart-2))",
    },
  } satisfies ChartConfig;

  const firedAtAge = projectionData.find((p) => p.isFired);

  // ── Push FI% to context (for sidebar badge) ─────────────────────────────────
  useEffect(() => {
    if (mounted) {
      setFiPercent(fiProgress > 0 ? fiProgress : null);
    }
  }, [fiProgress, mounted, setFiPercent]);

  // ── Derived labels ──────────────────────────────────────────────────────────
  const yearsLabel =
    yearsToFire === 0
      ? "FIRE achieved!"
      : yearsToFire >= 100
      ? "100+ years"
      : `${yearsToFire < 1 ? "<1" : yearsToFire.toFixed(1)} years`;

  // ── Loading state ───────────────────────────────────────────────────────────
  if (getAccountsData === undefined || getUserPortfolio === undefined) {
    return (
      <div className="flex min-h-screen bg-background">
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-background pr-4">
          <div className="p-4 lg:p-8 space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <SkeletonCard key={i} className="h-28" />
              ))}
            </div>
            <SkeletonCard className="h-48" />
            <SkeletonChart className="h-[300px]" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <AuthRequired>
    <div className="flex min-h-screen bg-background">
      <main className="flex-1 overflow-y-auto overflow-x-hidden bg-background pr-4">
        <div className="p-4 lg:p-8 space-y-6">

          {/* ── Hero ─────────────────────────────────────────────────────────── */}
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">

            {/* FIRE Number + years label */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/20 shrink-0">
                <FlameKindling className="w-7 h-7 text-white" />
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">FIRE Number</div>
                <div className="text-4xl font-bold tracking-tight">
                  {formatPortfolioValue(fireNumber)}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {yearsToFire === 0 ? (
                    <span className="inline-flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                      <CheckCircle2 className="w-4 h-4" />
                      FIRE achieved!
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      {yearsLabel} to FIRE
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Stat grid */}
            <div className="grid grid-cols-2 lg:grid-cols-2 gap-3 flex-1 lg:max-w-xl lg:ml-auto">
              <StatCard
                icon={<Target className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                label="FI Progress"
                value={`${fiProgress.toFixed(1)}%`}
                sub={<Progress value={fiProgress} className="mt-2 h-1.5" />}
                bg="from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20"
                border="border-blue-200/50 dark:border-blue-800/50"
              />
              <StatCard
                icon={<Wallet className="w-4 h-4 text-slate-600 dark:text-slate-400" />}
                label="Net Worth"
                value={`£${liveNetWorth.toLocaleString("en-US", { maximumFractionDigits: 0 })}`}
                bg="from-slate-50 to-slate-100/50 dark:from-slate-950/30 dark:to-slate-900/20"
                border="border-slate-200/50 dark:border-slate-800/50"
              />
            </div>
          </div>

          {/* ── Inputs + Milestones (side-by-side on lg, stacked on mobile) ─────── */}
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Your Numbers card */}
            <Card className="flex-1">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-muted-foreground" />
                  <CardTitle className="text-lg">Your Numbers</CardTitle>
                </div>
                <CardDescription>
                  Change any value to instantly recalculate your FIRE metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <NumberInput
                    id="annual-savings"
                    label="Predicted Annual Savings (£)"
                    value={annualSavings}
                    onChange={(v) => setAnnualSavings(Math.max(0, v))}
                    min={0}
                    step={1000}
                  />
                  <NumberInput
                    id="nominal-return"
                    label="Expected Return (%)"
                    value={nominalReturn}
                    onChange={(v) => setNominalReturn(Math.max(-10, Math.min(30, v)))}
                    min={-10}
                    max={30}
                    step={0.5}
                  />
                  <NumberInput
                    id="inflation-rate"
                    label="Inflation Rate (%)"
                    value={inflationRate}
                    onChange={(v) => setInflationRate(Math.max(0, Math.min(15, v)))}
                    min={0}
                    max={15}
                    step={0.5}
                  />
                  <NumberInput
                    id="annual-expenses"
                    label="Annual Expenditure in Retirement (£)"
                    value={annualExpenses}
                    onChange={(v) => setAnnualExpenses(Math.max(0, v))}
                    min={0}
                    step={1000}
                  />
                  <NumberInput
                    id="current-age"
                    label="Current Age"
                    value={currentAge}
                    onChange={(v) => setCurrentAge(Math.max(16, Math.min(99, v)))}
                    min={16}
                    max={99}
                    step={1}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Milestone row — 2 rows, height matches input card */}
            {milestones.length > 0 && (
              <div className="flex flex-col lg:w-2/5 shrink-0">
                <div className="grid grid-cols-3 gap-2 flex-1 min-h-0">
                  {milestones.map((m) => (
                    <div
                      key={m.age}
                      className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center h-full ${
                        m.percentFunded >= 100
                          ? "border-emerald-500/50 bg-emerald-50 dark:bg-emerald-950/20"
                          : m.percentFunded >= 50
                          ? "border-amber-500/50 bg-amber-50 dark:bg-amber-950/20"
                          : "border-border bg-muted/30"
                      }`}
                    >
                      <div className="text-xs text-muted-foreground font-medium">{m.label}</div>
                      <div className="text-sm font-bold mt-0.5">
                        {formatPortfolioValue(m.projectedValue)}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {m.percentFunded >= 100 ? "✓ FIRE" : `${m.percentFunded}%`}
                      </div>
                      <Progress value={m.percentFunded} className="mt-1 h-1 w-full" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Projection Chart ───────────────────────────────────────────────── */}
          <Card>
            <CardHeader className="pb-2">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                  Portfolio Projection
                </CardTitle>
                <CardDescription>
                  Portfolio growth vs. your FIRE number
                  {firedAtAge && yearsToFire > 0 && (
                    <span className="ml-1 text-amber-600 dark:text-amber-400 font-medium">
                      — FIRE reached at age {firedAtAge.age}
                    </span>
                  )}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <AreaChart
                  data={projectionData}
                  margin={{ top: 10, left: 0, right: 10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} className="stroke-muted" />
                  <XAxis
                    dataKey="age"
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    tickMargin={8}
                    tickFormatter={(v) => `Age ${v}`}
                    tickLine={false}
                    axisLine={false}
                    interval={Math.ceil(projectionData.length / 8)}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    tickFormatter={(v) => `£${(v / 1000).toFixed(0)}k`}
                    width={56}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, Math.max(fireNumber, projectionData[projectionData.length - 1]?.portfolioValue ?? 0)]}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent />}
                    formatter={(value: number) => [`£${value.toLocaleString()}`, "Value"]}
                    labelFormatter={(label) => `Age ${label}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="portfolioValue"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fill="url(#colorValue)"
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="fireTarget"
                    stroke="#f59e0b"
                    strokeWidth={3}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <ReferenceLine
                    y={fireNumber}
                    stroke="#f59e0b"
                    strokeWidth={1.5}
                    label={{
                      value: `FIRE: ${formatPortfolioValue(fireNumber)}`,
                      fill: "#f59e0b",
                      fontSize: 12,
                      position: "right",
                    }}
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* ── Formula Reference ─────────────────────────────────────────────── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">How your numbers are calculated</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <FormulaRow
                label="FIRE Number"
                formula={`£${annualExpenses.toLocaleString()} ÷ 4% SWR × (1 + ${inflationRate}%)^${ACCUMULATION_YEARS}`}
                result={formatPortfolioValue(fireNumber)}
              />
              <FormulaRow
                label="FI Progress"
                formula={`Net Worth ÷ FIRE Number = £${liveNetWorth.toLocaleString("en-US", { maximumFractionDigits: 0 })} ÷ ${formatPortfolioValue(fireNumber)}`}
                result={`${fiProgress.toFixed(1)}%`}
              />
              <FormulaRow
                label="Years to FIRE"
                formula={`Compound growth from £${liveNetWorth.toLocaleString("en-US", { maximumFractionDigits: 0 })} at ${nominalReturn}% return, saving £${annualSavings.toLocaleString()}/yr`}
                result={yearsToFire === 0 ? "Already FIRE!" : `${yearsToFire >= 100 ? "100+" : yearsToFire.toFixed(1)} years`}
              />
            </CardContent>
          </Card>

        </div>
      </main>
    </div>
    </AuthRequired>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  suffix,
  sub,
  bg,
  border,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  suffix?: string;
  sub?: React.ReactNode;
  bg: string;
  border: string;
}) {
  return (
    <div className={`bg-gradient-to-br ${bg} border ${border} rounded-xl p-4`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <div className="text-2xl font-bold">
        {value}
        {suffix && <span className="text-sm font-normal text-muted-foreground">{suffix}</span>}
      </div>
      {sub}
    </div>
  );
}

function NumberInput({
  id,
  label,
  sublabel,
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  id: string;
  label: string;
  sublabel?: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max?: number;
  step?: number;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline gap-1">
        <Label htmlFor={id} className="text-xs text-muted-foreground">
          {label}
        </Label>
        {sublabel && (
          <span className="text-[10px] text-muted-foreground italic">({sublabel})</span>
        )}
      </div>
      <Input
        id={id}
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const parsed = parseFloat(e.target.value);
          if (!isNaN(parsed)) {
            onChange(
              max != null
                ? Math.max(min, Math.min(max, parsed))
                : Math.max(min, parsed)
            );
          }
        }}
        className="h-10"
      />
    </div>
  );
}

function FormulaRow({
  label,
  formula,
  result,
}: {
  label: string;
  formula: string;
  result: string;
}) {
  return (
    <div className="flex items-start gap-2 flex-wrap">
      <span className="font-mono bg-muted px-2 py-0.5 rounded text-xs shrink-0">
        {label}
      </span>
      <span className="text-muted-foreground">
        {formula}{" "}
        <strong className="text-foreground">= {result}</strong>
      </span>
    </div>
  );
}
