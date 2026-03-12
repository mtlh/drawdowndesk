"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts"
import { Building2, TrendingUp, PieChart as PieChartIcon, BarChart3, Wallet } from "lucide-react"
import { calculatePortfolioSummary, normalizePortfolios, calculateAssetTypeAllocation, generateHoldingsTreemapData, getAccountAllocationData, getPortfolioAllocationData } from "../../lib/calculatePortfolioOverview"
import { api } from "../../../convex/_generated/api"
import { useQuery } from "convex/react"
import { usePortfolioData } from "@/hooks/usePortfolioData"
import { PortfolioDataResult } from "@/hooks/usePortfolioData"
import { CustomTreemap } from "@/components/customTreeMap/customTreeMap"
import { CHART_COLORS_MAIN, DONUT_INNER_RADIUS, DONUT_OUTER_RADIUS } from "@/lib/constants"
import { ChartTooltip, PieChartTooltip } from "@/components/chart-tooltip"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { ErrorDisplay } from "@/components/ui/error-display"

const COLORS = CHART_COLORS_MAIN

type PortfolioSnapshot = {
  _id: string;
  userId: string;
  portfolioId?: string;
  totalValue: number;
  snapshotDate: string;
  lastUpdated?: string;
};

export default function PortfolioOverview() {
  const portfolioData: PortfolioDataResult = usePortfolioData();
  const getPortfolioSnapshots = useQuery(api.portfolio.portfolioSnapshots.getPortfolioSnapshots, { months: 12 }) as PortfolioSnapshot[] | undefined | { error: string };

  const [excludedPortfolios, setExcludedPortfolios] = useState<Record<string, boolean>>({});

  const availablePortfolios = useMemo(() => {
    if (!getPortfolioSnapshots || "error" in getPortfolioSnapshots || getPortfolioSnapshots.length === 0) return [];
    const portfolioIds = new Set<string>();
    getPortfolioSnapshots.forEach((s: { portfolioId?: string }) => {
      if (s.portfolioId) portfolioIds.add(s.portfolioId);
    });
    return Array.from(portfolioIds);
  }, [getPortfolioSnapshots]);

  const portfolioNames = useMemo(() => {
    if (!portfolioData.success) return {};
    const names: Record<string, string> = {};
    portfolioData.data.forEach((p: { _id: string; name: string }) => { names[p._id] = p.name; });
    return names;
  }, [portfolioData]);

  const togglePortfolio = (portfolioId: string) => {
    setExcludedPortfolios(prev => ({
      ...prev,
      [portfolioId]: !prev[portfolioId]
    }));
  };

  const isPortfolioExcluded = (portfolioId: string) => !!excludedPortfolios[portfolioId];

  const includeAllPortfolios = () => setExcludedPortfolios({});
  const excludeAllPortfolios = () => {
    const allExcluded: Record<string, boolean> = {};
    availablePortfolios.forEach((id: string) => { allExcluded[id] = true; });
    setExcludedPortfolios(allExcluded);
  };

  // All hooks must be called before any conditional returns
  const portfolioSummary = useMemo(() => {
    if (!portfolioData.success) return null;
    return calculatePortfolioSummary(normalizePortfolios(portfolioData.data));
  }, [portfolioData]);

  const portfolioAllocationData = useMemo(() => {
    if (!portfolioSummary) return [];
    return getPortfolioAllocationData(portfolioSummary.portfolios);
  }, [portfolioSummary]);

  const hasSnapshots = getPortfolioSnapshots && Array.isArray(getPortfolioSnapshots) && getPortfolioSnapshots.length > 0;

  const performanceData = useMemo(() => {
    if (!hasSnapshots) return [];

    const snapshots = getPortfolioSnapshots as Array<{ portfolioId?: string; totalValue: number; snapshotDate: string }>;
    
    // Group by date and portfolio - include all portfolios
    const dateMap = new Map<string, Map<string, number>>();
    snapshots.forEach(s => {
      if (!dateMap.has(s.snapshotDate)) {
        dateMap.set(s.snapshotDate, new Map());
      }
      const portfolioMap = dateMap.get(s.snapshotDate)!;
      const key = s.portfolioId || "total";
      const current = portfolioMap.get(key) || 0;
      portfolioMap.set(key, current + s.totalValue);
    });

    // Convert to array and sort by date
    const sortedDates = Array.from(dateMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));

    if (sortedDates.length === 0) return [];

    // Get all portfolio keys
    const portfolioKeys = new Set<string>();
    sortedDates.forEach(([, portfolioMap]) => {
      portfolioMap.forEach((_, key) => portfolioKeys.add(key));
    });

    // Get initial values for each portfolio (for % calculation)
    // Use the FIRST NON-ZERO value for each portfolio, not just the first date
    const initialValues: Record<string, number> = {};
    portfolioKeys.forEach(key => {
      initialValues[key] = 0;
    });
    for (const [, portfolioMap] of sortedDates) {
      portfolioKeys.forEach(key => {
        if (initialValues[key] === 0) {
          const val = portfolioMap.get(key);
          if (val !== undefined && val > 0) {
            initialValues[key] = val;
          }
        }
      });
    }

    // Build data with percentage changes for each portfolio
    const lastKnownValues: Record<string, number> = {};
    return sortedDates.map(([date, portfolioMap]) => {
      const dataPoint: Record<string, string | number> = {
        date: new Date(date).toLocaleDateString("en-GB", { month: "short", day: "numeric" }),
      };
      
      portfolioKeys.forEach(key => {
        const value = portfolioMap.get(key);
        if (value !== undefined) {
          lastKnownValues[key] = value;
        }
        const currentValue = lastKnownValues[key] || 0;
        const initial = initialValues[key];
        const percentChange = initial > 0 && currentValue > 0 ? ((currentValue - initial) / initial) * 100 : 0;
        dataPoint[key] = percentChange;
      });

      return dataPoint;
    });
  }, [hasSnapshots, getPortfolioSnapshots]);

  const allPortfolioKeys = useMemo(() => {
    if (performanceData.length === 0) return [];
    const keys: string[] = [];
    performanceData.forEach(d => {
      Object.keys(d).forEach(k => {
        if (k !== "date" && !keys.includes(k)) keys.push(k);
      });
    });
    return keys.sort((a, b) => {
      if (a === "total") return -1;
      if (b === "total") return 1;
      return a.localeCompare(b);
    });
  }, [performanceData]);

  const lineColors = ["#4F46E5", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16"];

  const visiblePortfolios = allPortfolioKeys.filter(k => k === "total" || !isPortfolioExcluded(k));

  const percentDomain = (() => {
    if (performanceData.length === 0) return [-10, 10];
    const allValues: number[] = [];
    performanceData.forEach(d => {
      visiblePortfolios.forEach(key => {
        const val = d[key];
        if (typeof val === "number") allValues.push(val);
      });
    });
    if (allValues.length === 0) return [-10, 10];
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const padding = Math.max(Math.abs(max - min) * 0.1, 1);
    return [Math.min(min - padding, 0), Math.max(max + padding, 0)];
  })();

  // Calculate YTD from raw snapshots
  const currentYear = new Date().getFullYear();
  const ytdValue = (() => {
    if (!hasSnapshots || !portfolioSummary) return null;

    const snapshots = getPortfolioSnapshots as Array<{ portfolioId?: string; totalValue: number; snapshotDate: string }>;
    
    // Get year start value (total only)
    const yearStartSnapshot = snapshots
      .filter(s => !s.portfolioId && new Date(s.snapshotDate).getFullYear() === currentYear)
      .sort((a, b) => a.snapshotDate.localeCompare(b.snapshotDate))[0];

    if (!yearStartSnapshot || yearStartSnapshot.totalValue <= 0) return null;
    if (!portfolioSummary.totalValue) return null;

    return ((portfolioSummary.totalValue - yearStartSnapshot.totalValue) / yearStartSnapshot.totalValue) * 100;
  })();

  // Handle loading state
  if (portfolioData.isLoading) {
    return <LoadingSpinner fullScreen />;
  }

  // Handle error state
  if (!portfolioData.success) {
    return <ErrorDisplay message={portfolioData.error} />;
  }

  // Handle case where portfolioSummary is null (no holdings)
  const summary = portfolioSummary ?? { totalValue: 0, totalChange: 0, totalChangePercent: 0, portfolios: [] };

  const assetTypeData = calculateAssetTypeAllocation(summary.portfolios)
  const accountAllocationData = getAccountAllocationData(summary.portfolios)
  const treemapData = generateHoldingsTreemapData(summary.portfolios)

  // Reusable chart tooltips
  const PieTooltip = PieChartTooltip({})

  // Enhanced tooltip for multi-line performance chart
  const PerformanceTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
    if (!active || !payload?.length) return null;
    
    return (
      <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg text-sm min-w-[180px]">
        {label && (
          <div className="font-semibold text-muted-foreground border-b border-border pb-1.5 mb-1.5">
            {label}
          </div>
        )}
        {payload.map((entry, index) => {
          const name = entry.name === "total" ? "Total" : (portfolioNames[entry.name] || entry.name.slice(0, 8));
          const val = entry.value;
          return (
            <div key={index} className="flex items-center justify-between gap-4 mt-1">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-muted-foreground">{name}</span>
              </div>
              <span className={val >= 0 ? "font-medium text-emerald-600" : "font-medium text-red-600"}>
                {val >= 0 ? "+" : ""}{val.toFixed(2)}%
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  // Tooltip for percentage-based charts
  const PercentTooltip = ChartTooltip({
    formatter: (value: number) => `${value.toFixed(1)}%`,
  })

  return (
    <div className="flex min-h-screen bg-background">
      <main className="flex-1 overflow-y-auto overflow-x-hidden bg-background pr-4">
        <div className="p-4 lg:p-8 space-y-6">
          {/* Header Section */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Total Value Display */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-600/20">
                <Wallet className="w-7 h-7 text-white" />
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Total Holdings Value</div>
                <div className="text-4xl font-bold tracking-tight">
                  £{summary.totalValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {summary.totalChangePercent >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <TrendingUp className="w-4 h-4 text-red-600 rotate-180" />
                  )}
                  <span className={`text-sm font-medium ${summary.totalChangePercent >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {summary.totalChangePercent >= 0 ? "+" : ""}{summary.totalChangePercent.toFixed(1)}%
                  </span>
                  <span className="text-sm text-muted-foreground">all time</span>
                </div>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1 lg:max-w-3xl">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border border-blue-200/50 dark:border-blue-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Portfolios</span>
                </div>
                <div className="text-2xl font-bold">{summary.portfolios.length}</div>
              </div>
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 border border-emerald-200/50 dark:border-emerald-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <PieChartIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Holdings</span>
                </div>
                <div className="text-2xl font-bold">
                  {summary.portfolios.reduce((acc, portfolio) => acc + portfolio.holdings.length, 0)}
                </div>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20 border border-amber-200/50 dark:border-amber-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <BarChart3 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span className="text-xs font-medium text-amber-600 dark:text-amber-400">YTD</span>
                </div>
                <div className={`text-2xl font-bold ${ytdValue !== null && ytdValue >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                  {ytdValue !== null ? (ytdValue >= 0 ? "+" : "") + ytdValue.toFixed(1) + "%" : "—"}
                </div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20 border border-purple-200/50 dark:border-purple-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-xs font-medium text-purple-600 dark:text-purple-400">Growth</span>
                </div>
                <div className={`text-2xl font-bold ${summary.totalChangePercent >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                  {summary.totalChangePercent >= 0 ? "+" : ""}{summary.totalChangePercent.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>

        {/* Charts Grid */}
        <div className="grid gap-6 lg:grid-cols-8">
          {/* Portfolio Performance - Line Chart */}
          <Card className="lg:col-span-5">
            <CardHeader className="pb-2">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  Performance
                </CardTitle>
                <CardDescription>{hasSnapshots ? "12-month history (% change from start)" : "Track your portfolio over time"}</CardDescription>
              </div>
              {allPortfolioKeys.length > 0 && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {allPortfolioKeys.length > 1 && (
                      <>
                        <Button variant="outline" size="sm" onClick={includeAllPortfolios} className="h-6 text-xs px-2">
                          All
                        </Button>
                        <Button variant="outline" size="sm" onClick={excludeAllPortfolios} className="h-6 text-xs px-2">
                          None
                        </Button>
                        <div className="w-px h-4 bg-border" />
                      </>
                    )}
                    {/* Always show Total */}
                    <button
                      className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs cursor-default"
                    >
                      <span 
                        className="w-3 h-3 rounded-sm" 
                        style={{ backgroundColor: lineColors[0] }}
                      />
                      <span className="font-semibold">Total</span>
                    </button>
                    {/* Show individual portfolios */}
                    {allPortfolioKeys.filter(k => k !== "total").map((key, index) => {
                      const isExcluded = isPortfolioExcluded(key);
                      const color = lineColors[index + 1];
                      return (
                        <button
                          key={key}
                          onClick={() => togglePortfolio(key)}
                          className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-colors ${
                            isExcluded 
                              ? "opacity-40 hover:opacity-70" 
                              : "hover:bg-accent"
                          }`}
                        >
                          <span 
                            className="w-3 h-3 rounded-sm" 
                            style={{ backgroundColor: color }}
                          />
                          <span>
                            {portfolioNames[key] || key.slice(0, 8)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {hasSnapshots && allPortfolioKeys.length > 0 ? (
                <div className="[&_.recharts-cartesian-axis-tick_text]:!fill-muted-foreground">
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={performanceData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="date"
                      stroke="hsl(var(--muted-foreground))"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "currentColor", fontSize: 12 }}
                    />
                    <YAxis
                      domain={percentDomain}
                      stroke="hsl(var(--muted-foreground))"
                      tickFormatter={(value) => `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "currentColor", fontSize: 12 }}
                    />
                    <Tooltip content={<PerformanceTooltip />} />
                    {visiblePortfolios.map((key, index) => (
                      <Line
                        key={key}
                        type="monotone"
                        dataKey={key}
                        name={key}
                        stroke={lineColors[index % lineColors.length]}
                        strokeWidth={2.5}
                        dot={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[280px] flex flex-col items-center justify-center text-center p-6">
                  <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
                    <TrendingUp className="w-7 h-7 text-muted-foreground" />
                  </div>
                  <p className="text-lg font-semibold mb-2">No performance data yet</p>
                  <p className="text-sm text-muted-foreground">
                    Visit the Holdings page to refresh prices.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Portfolio Split - Donut Chart */}
          <Card className="lg:col-span-3">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <PieChartIcon className="w-5 h-5 text-emerald-600" />
                By Portfolio
              </CardTitle>
              <CardDescription>Distribution</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={portfolioAllocationData}
                    cx="50%"
                    cy="50%"
                    innerRadius={DONUT_INNER_RADIUS}
                    outerRadius={DONUT_OUTER_RADIUS}
                    paddingAngle={3}
                    cornerRadius={8}
                    dataKey="value"
                    labelLine={true}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {portfolioAllocationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Account Split - Donut Chart */}
          <Card className="lg:col-span-3">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="w-5 h-5 text-purple-600" />
                By Account
              </CardTitle>
              <CardDescription>Holdings value</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={accountAllocationData}
                    cx="50%"
                    cy="50%"
                    innerRadius={DONUT_INNER_RADIUS - 10}
                    outerRadius={DONUT_OUTER_RADIUS - 10}
                    paddingAngle={3}
                    cornerRadius={8}
                    dataKey="value"
                    labelLine={true}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {accountAllocationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Asset Distribution - Bar Chart */}
          <Card className="lg:col-span-5">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-amber-600" />
                Asset Allocation
              </CardTitle>
              <CardDescription>By type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="[&_.recharts-cartesian-axis-tick_text]:!fill-muted-foreground" suppressHydrationWarning>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={assetTypeData} barGap={8} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    tickFormatter={(value) => `${value.toFixed(0)}%`}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={PercentTooltip} />
                  <Bar
                    dataKey="value"
                    radius={[6, 6, 0, 0]}
                    barSize={80}
                    isAnimationActive={false}
                    activeBar={(props: { x?: number; y?: number; width?: number; height?: number; fill?: string }) => (
                      <rect
                        fill={props.fill || "#4F46E5"}
                        fillOpacity={0.9}
                        rx={6}
                        x={props.x}
                        y={props.y}
                        width={props.width}
                        height={props.height}
                      />
                    )}
                  >
                    {assetTypeData.map((entry, index) => (
                      <Cell key={`cell-${entry.name}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Holdings Treemap */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Wallet className="w-5 h-5 text-violet-600" />
              Holdings by Account
            </CardTitle>
            <CardDescription>Stock/bond split within each account</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full">
              <CustomTreemap data={treemapData} />
            </div>
          </CardContent>
        </Card>
        </div>
      </main>
    </div>
  )
}
