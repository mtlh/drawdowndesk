"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Line,
  LineChart,
} from "recharts";
import { Calculator, TrendingUp, Calendar, PoundSterling, AlertCircle, Building2, Wallet, PiggyBank } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { CreateTakeHome, TaxInfo } from "@/lib/createTakeHome";

// Account types with different tax treatments
type AccountType = "pension" | "isa" | "gia";

interface Account {
  type: AccountType;
  value: number;
  name: string;
  icon: React.ReactNode;
  color: string;
  description: string;
}

interface CashflowYear {
  age: number;
  pensionPot: number;
  isaPot: number;
  giaPot: number;
  totalPot: number;
  pensionWithdrawal: number;
  isaWithdrawal: number;
  giaWithdrawal: number;
  totalWithdrawal: number;
  statePension: number;
  pensionTaxFree: number;
  pensionTaxed: number;
  isaWithdrawal: number;
  giaWithdrawal: number;
  grossIncome: number;
  incomeTax: number;
  nationalInsurance: number;
  takeHomePay: number;
}

interface SummaryMetrics {
  totalWithdrawals: number;
  totalTax: number;
  totalTakeHome: number;
  yearsUntilDepleted: number;
  finalTotalValue: number;
  pensionTotal: number;
  isaTotal: number;
  giaTotal: number;
}

// Custom hook for calculations with multiple accounts
const useCashflowCalculation = (
  accounts: Account[],
  annualGrowthRate: number,
  withdrawalRate: number,
  startAge: number,
  statePension: number,
  statePensionAge: number,
  taxInfo: TaxInfo
) => {
  return useMemo((): { chartData: CashflowYear[]; summary: SummaryMetrics } => {
    const endAge = 100;

    // Initialize pots
    let pensionPot = accounts.find(a => a.type === "pension")?.value || 0;
    let isaPot = accounts.find(a => a.type === "isa")?.value || 0;
    let giaPot = accounts.find(a => a.type === "gia")?.value || 0;

    const years: CashflowYear[] = [];
    let yearsUntilDepleted = endAge - startAge;
    let finalTotalValue = 0;

    for (let age = startAge; age <= endAge; age++) {
      // Apply growth to each pot
      const pensionGrowth = pensionPot * annualGrowthRate;
      const isaGrowth = isaPot * annualGrowthRate;
      const giaGrowth = giaPot * annualGrowthRate;

      pensionPot += pensionGrowth;
      isaPot += isaGrowth;
      giaPot += giaGrowth;

      // State pension
      const currentStatePension = age >= statePensionAge ? statePension : 0;

      // Calculate withdrawals from each pot (proportional to pot size)
      const totalPot = pensionPot + isaPot + giaPot;
      const withdrawal = totalPot > 0 ? Math.min(totalPot * withdrawalRate, totalPot) : 0;

      // Withdraw proportionally from each pot
      let pensionWithdrawal = 0;
      let isaWithdrawal = 0;
      let giaWithdrawal = 0;

      if (withdrawal > 0 && totalPot > 0) {
        const ratio = withdrawal / totalPot;
        pensionWithdrawal = pensionPot * ratio;
        isaWithdrawal = isaPot * ratio;
        giaWithdrawal = giaPot * ratio;
      }

      // Update pots after withdrawal
      pensionPot -= pensionWithdrawal;
      isaPot -= isaWithdrawal;
      giaPot -= giaWithdrawal;

      // Ensure no negative values
      pensionPot = Math.max(0, pensionPot);
      isaPot = Math.max(0, isaPot);
      giaPot = Math.max(0, giaPot);

      // Calculate tax for each account type
      // Pension: 25% tax-free, rest taxed as income
      const pensionTaxFree = pensionWithdrawal * 0.25;
      const pensionTaxed = pensionWithdrawal * 0.75;

      // ISA: completely tax-free
      const isaTaxFree = isaWithdrawal;

      // GIA: assume all is gain for simplicity (in reality only gains are taxed)
      // For simplicity, we'll treat GIA withdrawals as taxable
      const giaTaxable = giaWithdrawal;

      // Total taxable income
      const totalTaxableIncome = pensionTaxed + giaTaxable + currentStatePension;

      // Calculate tax using existing function
      const taxResult = CreateTakeHome(taxInfo, totalTaxableIncome);
      const hasError = 'error' in taxResult && taxResult.error;

      // Scale tax proportionally to each income source
      const incomeTax = hasError ? 0 : (taxResult as { incomeTax: number }).incomeTax;
      const nationalInsurance = hasError ? 0 : (taxResult as { nationalInsurance: number }).nationalInsurance;

      // Calculate tax on pension portion (proportional)
      let pensionIncomeTax = 0;
      let giaIncomeTax = 0;
      if (totalTaxableIncome > 0) {
        pensionIncomeTax = pensionTaxed > 0 ? (pensionTaxed / totalTaxableIncome) * incomeTax : 0;
        giaIncomeTax = giaTaxable > 0 ? (giaTaxable / totalTaxableIncome) * incomeTax : 0;
      }

      // Take home from each source
      const pensionTakeHome = pensionTaxFree + (pensionTaxed - pensionIncomeTax);
      const isaTakeHome = isaTaxFree;
      const giaTakeHome = giaTaxable - giaIncomeTax;
      const statePensionTakeHome = currentStatePension - (currentStatePension > 0 ? ((currentStatePension / totalTaxableIncome) * incomeTax || 0) : 0);

      const totalTakeHome = pensionTakeHome + isaTakeHome + giaTakeHome + statePensionTakeHome;

      // Track when all pots deplete
      const currentTotalPot = pensionPot + isaPot + giaPot;
      if (currentTotalPot <= 0 && yearsUntilDepleted === endAge - startAge) {
        yearsUntilDepleted = age - startAge;
      }

      finalTotalValue = currentTotalPot;

      years.push({
        age,
        pensionPot,
        isaPot,
        giaPot,
        totalPot: currentTotalPot,
        pensionWithdrawal,
        isaWithdrawal,
        giaWithdrawal,
        totalWithdrawal: pensionWithdrawal + isaWithdrawal + giaWithdrawal,
        statePension: currentStatePension,
        pensionTaxFree,
        pensionTaxed,
        isaWithdrawal: isaWithdrawal,
        giaWithdrawal,
        grossIncome: pensionWithdrawal + isaWithdrawal + giaWithdrawal + currentStatePension,
        incomeTax: pensionIncomeTax + giaIncomeTax + ((currentStatePension / (totalTaxableIncome || 1)) * incomeTax || 0),
        nationalInsurance,
        takeHomePay: totalTakeHome,
      });
    }

    const summary: SummaryMetrics = {
      totalWithdrawals: years.reduce((sum, y) => sum + y.totalWithdrawal, 0),
      totalTax: years.reduce((sum, y) => sum + y.incomeTax + y.nationalInsurance, 0),
      totalTakeHome: years.reduce((sum, y) => sum + y.takeHomePay, 0),
      yearsUntilDepleted: yearsUntilDepleted === endAge - startAge && finalTotalValue > 0
        ? endAge - startAge + 1
        : yearsUntilDepleted,
      finalTotalValue,
      pensionTotal: years.reduce((sum, y) => sum + y.pensionWithdrawal, 0),
      isaTotal: years.reduce((sum, y) => sum + y.isaWithdrawal, 0),
      giaTotal: years.reduce((sum, y) => sum + y.giaWithdrawal, 0),
    };

    return { chartData: years, summary };
  }, [accounts, annualGrowthRate, withdrawalRate, startAge, statePension, statePensionAge, taxInfo]);
};

export default function RetirementCashflowCalculator() {
  // Tax data
  const taxBandInformation = useQuery(api.tax.runTaxQuery.getTaxInfoForIncome, {
    taxYear: 2025
  }) as TaxInfo;

  // Account values
  const [pensionValue, setPensionValue] = useState(500000);
  const [isaValue, setIsaValue] = useState(100000);
  const [giaValue, setGiaValue] = useState(100000);

  // Growth and withdrawal rates (same for all accounts)
  const [growthRate, setGrowthRate] = useState(5);
  const [withdrawalRate, setWithdrawalRate] = useState(3);

  // State pension
  const [statePension, setStatePension] = useState(11000);
  const [statePensionAge, setStatePensionAge] = useState(67);
  const [startAge, setStartAge] = useState(55);

  // Build accounts array
  const accounts: Account[] = [
    {
      type: "pension",
      value: pensionValue,
      name: "Pension",
      icon: <Building2 className="h-4 w-4" />,
      color: "var(--chart-1)",
      description: "25% tax-free, rest taxed as income",
    },
    {
      type: "isa",
      value: isaValue,
      name: "ISA",
      icon: <PiggyBank className="h-4 w-4" />,
      color: "var(--chart-2)",
      description: "Completely tax-free",
    },
    {
      type: "gia",
      value: giaValue,
      name: "GIA",
      icon: <Wallet className="h-4 w-4" />,
      color: "var(--chart-4)",
      description: "Taxed on gains within income brackets",
    },
  ];

  const totalPortfolio = pensionValue + isaValue + giaValue;

  // Calculate data
  const { chartData, summary } = useCashflowCalculation(
    accounts,
    growthRate / 100,
    withdrawalRate / 100,
    startAge,
    statePension,
    statePensionAge,
    taxBandInformation
  );

  // Loading/error states
  if (!taxBandInformation) {
    return (
      <div className="flex h-screen bg-background items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading tax information...</p>
        </div>
      </div>
    );
  }

  if (taxBandInformation && 'error' in taxBandInformation && taxBandInformation.error) {
    return (
      <div className="flex h-screen bg-background items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Error Loading Tax Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{taxBandInformation.error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Chart configurations
  const incomeConfig = {
    takeHomePension: { label: "Pension Take Home", color: "var(--chart-1)" },
    isaIncome: { label: "ISA", color: "var(--chart-2)" },
    giaIncome: { label: "GIA", color: "var(--chart-4)" },
    statePension: { label: "State Pension", color: "var(--chart-5)" },
    tax: { label: "Tax", color: "var(--chart-3)" },
  } satisfies ChartConfig;

  const potConfig = {
    pension: { label: "Pension", color: "var(--chart-1)" },
    isa: { label: "ISA", color: "var(--chart-2)" },
    gia: { label: "GIA", color: "var(--chart-4)" },
  } satisfies ChartConfig;

  return (
    <div className="flex h-screen bg-background">
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 space-y-8">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Calculator className="h-8 w-8 text-primary" />
              Retirement Cashflow Calculator
            </h1>
            <p className="text-muted-foreground max-w-2xl">
              Plan your retirement income across different account types. Each account has different tax treatment:
              Pensions are taxed on withdrawal (25% tax-free), ISAs are completely tax-free, and GIAs are taxed on gains.
            </p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <PoundSterling className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Total Take Home</span>
                </div>
                <div className="text-2xl font-bold">£{summary.totalTakeHome.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">over retirement</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Total Tax Paid</span>
                </div>
                <div className="text-2xl font-bold text-destructive">£{summary.totalTax.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">income tax + NI</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Money Lasts Until</span>
                </div>
                <div className="text-2xl font-bold">
                  {summary.yearsUntilDepleted > 100 - startAge ? "Never" : `Age ${startAge + summary.yearsUntilDepleted}`}
                </div>
                <p className="text-xs text-muted-foreground">
                  {summary.yearsUntilDepleted > 100 - startAge
                    ? "pot survives full period"
                    : `${summary.yearsUntilDepleted} years`}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="h-4 w-4" style={{ color: "var(--chart-1)" }} />
                  <span className="text-sm text-muted-foreground">Pension Total</span>
                </div>
                <div className="text-2xl font-bold">£{summary.pensionTotal.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">taxed income</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <PiggyBank className="h-4 w-4" style={{ color: "var(--chart-2)" }} />
                  <span className="text-sm text-muted-foreground">ISA + GIA Total</span>
                </div>
                <div className="text-2xl font-bold">£{(summary.isaTotal + summary.giaTotal).toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">tax-free + taxed</p>
              </CardContent>
            </Card>
          </div>

          {/* Account Inputs */}
          <Card>
            <CardHeader>
              <CardTitle>Account Balances</CardTitle>
              <CardDescription>Enter the value of each account type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                {/* Pension */}
                <div className="space-y-2">
                  <Label htmlFor="pensionValue" className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" style={{ color: "var(--chart-1)" }} />
                    Pension Pot (£)
                  </Label>
                  <Input
                    id="pensionValue"
                    type="number"
                    step="10000"
                    value={pensionValue}
                    onChange={(e) => setPensionValue(Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">25% tax-free, rest taxed as income</p>
                </div>

                {/* ISA */}
                <div className="space-y-2">
                  <Label htmlFor="isaValue" className="flex items-center gap-2">
                    <PiggyBank className="h-4 w-4" style={{ color: "var(--chart-2)" }} />
                    ISA Value (£)
                  </Label>
                  <Input
                    id="isaValue"
                    type="number"
                    step="10000"
                    value={isaValue}
                    onChange={(e) => setIsaValue(Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">Completely tax-free withdrawals</p>
                </div>

                {/* GIA */}
                <div className="space-y-2">
                  <Label htmlFor="giaValue" className="flex items-center gap-2">
                    <Wallet className="h-4 w-4" style={{ color: "var(--chart-4)" }} />
                    GIA Value (£)
                  </Label>
                  <Input
                    id="giaValue"
                    type="number"
                    step="10000"
                    value={giaValue}
                    onChange={(e) => setGiaValue(Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">Taxed on gains within income brackets</p>
                </div>
              </div>

              <div className="mt-4 p-3 bg-muted rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total Portfolio:</span>
                  <span className="text-xl font-bold">£{totalPortfolio.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Other Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Retirement Settings</CardTitle>
              <CardDescription>Configure your retirement timeline and assumptions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Starting Age */}
                <div>
                  <Label htmlFor="startAge">Retirement Start Age</Label>
                  <Input
                    id="startAge"
                    type="number"
                    min={18}
                    max={80}
                    value={startAge}
                    onChange={(e) => setStartAge(Number(e.target.value))}
                    className="mt-2"
                  />
                </div>

                {/* State Pension */}
                <div>
                  <Label htmlFor="statePension">Annual State Pension (£)</Label>
                  <Input
                    id="statePension"
                    type="number"
                    step="500"
                    value={statePension}
                    onChange={(e) => setStatePension(Number(e.target.value))}
                    className="mt-2"
                  />
                </div>

                {/* State Pension Age */}
                <div>
                  <Label htmlFor="statePensionAge">State Pension Age</Label>
                  <Select value={statePensionAge.toString()} onValueChange={(v) => setStatePensionAge(Number(v))}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[60, 61, 62, 63, 64, 65, 66, 67, 68].map((age) => (
                        <SelectItem key={age} value={age.toString()}>
                          Age {age}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Growth Rate */}
                <div>
                  <Label htmlFor="growthRate">Annual Growth Rate (%)</Label>
                  <Select value={growthRate.toString()} onValueChange={(v) => setGrowthRate(Number(v))}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((rate) => (
                        <SelectItem key={rate} value={rate.toString()}>
                          {rate}%
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Withdrawal Rate */}
                <div>
                  <Label htmlFor="withdrawalRate">Annual Withdrawal Rate (%)</Label>
                  <Select value={withdrawalRate.toString()} onValueChange={(v) => setWithdrawalRate(Number(v))}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rate) => (
                        <SelectItem key={rate} value={rate.toString()}>
                          {rate}%
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Charts */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Income Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Annual Income by Source (£)</CardTitle>
                <CardDescription>Income from each account type</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={incomeConfig} className="h-[300px] w-full">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="age" tickLine={false} tickMargin={8} />
                    <YAxis tickLine={false} tickMargin={8} tickFormatter={(v) => `£${(v/1000).toFixed(0)}k`} />
                    <ChartTooltip
                      content={<ChartTooltipContent />}
                      formatter={(value: number) => [`£${value.toLocaleString()}`, ""]}
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="takeHomePay" stackId="a" fill="var(--color-takeHomePension)" radius={[0, 0, 2, 2]} />
                    <Bar dataKey="isaWithdrawal" stackId="a" fill="var(--color-isaIncome)" />
                    <Bar dataKey="giaWithdrawal" stackId="a" fill="var(--color-giaIncome)" />
                    <Bar dataKey="statePension" stackId="a" fill="var(--color-statePension)" />
                    <Bar dataKey="incomeTax" stackId="a" fill="var(--color-tax)" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Pot Value Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Account Values Over Time (£)</CardTitle>
                <CardDescription>Projected value of each account</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={potConfig} className="h-[300px] w-full">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="age" tickLine={false} tickMargin={8} />
                    <YAxis tickLine={false} tickMargin={8} tickFormatter={(v) => `£${(v/1000000).toFixed(1)}M`} />
                    <ChartTooltip
                      content={<ChartTooltipContent />}
                      formatter={(value: number) => [`£${value.toLocaleString()}`, ""]}
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Line type="monotone" dataKey="pensionPot" stroke="var(--color-pension)" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="isaPot" stroke="var(--color-isa)" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="giaPot" stroke="var(--color-gia)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Table */}
          <Card>
            <CardHeader>
              <CardTitle>Year-by-Year Breakdown</CardTitle>
              <CardDescription>Detailed projection by age</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2">Age</th>
                      <th className="text-right py-2 px-2">Pension</th>
                      <th className="text-right py-2 px-2">ISA</th>
                      <th className="text-right py-2 px-2">GIA</th>
                      <th className="text-right py-2 px-2">Total Pot</th>
                      <th className="text-right py-2 px-2">Withdrawal</th>
                      <th className="text-right py-2 px-2">Tax</th>
                      <th className="text-right py-2 px-2">Take Home</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chartData.filter((_, i) => i % 5 === 0 || i === chartData.length - 1).map((year) => (
                      <tr key={year.age} className="border-b">
                        <td className="py-2 px-2 font-medium">{year.age}</td>
                        <td className="text-right py-2 px-2">£{year.pensionPot.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                        <td className="text-right py-2 px-2">£{year.isaPot.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                        <td className="text-right py-2 px-2">£{year.giaPot.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                        <td className="text-right py-2 px-2 font-medium">£{year.totalPot.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                        <td className="text-right py-2 px-2">£{year.totalWithdrawal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                        <td className="text-right py-2 px-2 text-destructive">£{year.incomeTax.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                        <td className="text-right py-2 px-2 font-medium">£{year.takeHomePay.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Assumptions & Disclaimers */}
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="assumptions">
              <AccordionTrigger>Model Assumptions</AccordionTrigger>
              <AccordionContent>
                <ul className="list-disc pl-4 space-y-1 text-sm text-muted-foreground">
                  <li><strong>Pension:</strong> 25% tax-free lump sum, remaining 75% taxed as income</li>
                  <li><strong>ISA:</strong> Completely tax-free withdrawals (contributions already taxed)</li>
                  <li><strong>GIA:</strong> Entire withdrawal treated as taxable income (simplified)</li>
                  <li>Growth is applied annually before withdrawals</li>
                  <li>Withdrawals are taken proportionally from each account</li>
                  <li>State pension begins at the specified age and continues for life</li>
                  <li>All figures are in today&apos;s pounds (inflation not explicitly modeled)</li>
                </ul>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="limitations">
              <AccordionTrigger>Limitations</AccordionTrigger>
              <AccordionContent>
                <ul className="list-disc pl-4 space-y-1 text-sm text-muted-foreground">
                  <li>Market volatility is not modeled - returns are assumed constant</li>
                  <li>Sequence of returns risk is not accounted for</li>
                  <li>Tax rates may change in future years</li>
                  <li>State pension age and amount may change</li>
                  <li>GIA calculation is simplified - only gains should be taxed, not original contributions</li>
                  <li>ISA allowance limits not considered</li>
                  <li>No allowance for investment fees or advice costs</li>
                </ul>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="disclaimer">
              <AccordionTrigger>Important Disclaimer</AccordionTrigger>
              <AccordionContent>
                <p className="text-sm text-muted-foreground">
                  This calculator provides illustrative projections based on the assumptions you enter.
                  It is not financial advice and should not be used as the sole basis for retirement decisions.
                  Results are not guaranteed and your actual outcomes may differ significantly.
                  Please consult a qualified financial adviser for personalized advice.
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </main>
    </div>
  );
}
