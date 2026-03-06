"use client"

import { useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { CustomTreemap } from "@/components/customTreeMap/customTreeMap"
import { CHART_COLORS_MAIN, DONUT_INNER_RADIUS, DONUT_OUTER_RADIUS } from "@/lib/constants"
import { ChartTooltip, PieChartTooltip } from "@/components/chart-tooltip"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { ErrorDisplay } from "@/components/ui/error-display"

const COLORS = CHART_COLORS_MAIN

export default function PortfolioOverview() {
  const portfolioData = usePortfolioData();
  const getPortfolioSnapshots = useQuery(api.portfolio.portfolioSnapshots.getPortfolioSnapshots, { months: 12 });

  // All hooks must be called before any conditional returns
  const portfolioSummary = useMemo(() => {
    if (!portfolioData.success) return null;
    return calculatePortfolioSummary(normalizePortfolios(portfolioData.data));
  }, [portfolioData]);

  const portfolioAllocationData = useMemo(() => {
    if (!portfolioSummary) return [];
    return getPortfolioAllocationData(portfolioSummary.portfolios);
  }, [portfolioSummary]);

  // Calculate 1-day changes from snapshots
  const oneDayChanges = useMemo(() => {
    if (!portfolioData.success || !getPortfolioSnapshots || "error" in getPortfolioSnapshots || getPortfolioSnapshots.length === 0) return {};

    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    const changes: Record<string, { oneDayChange: number; oneDayChangePercent: number }> = {};

    // Get portfolio IDs from the data
    const portfolioMap = new Map(portfolioData.data.map(p => [p._id, p.name]));

    for (const [portfolioId, portfolioName] of portfolioMap) {
      const todaySnapshots = getPortfolioSnapshots.filter(s =>
        s.portfolioId === portfolioId && s.snapshotDate === today
      );
      const yesterdaySnapshots = getPortfolioSnapshots.filter(s =>
        s.portfolioId === portfolioId && s.snapshotDate === yesterdayStr
      );

      const todayValue = todaySnapshots.length > 0 ? todaySnapshots[0].totalValue : 0;
      const yesterdayValue = yesterdaySnapshots.length > 0 ? yesterdaySnapshots[0].totalValue : 0;
      const change = todayValue - yesterdayValue;
      const changePercent = yesterdayValue > 0 ? (change / yesterdayValue) * 100 : 0;

      changes[portfolioName] = { oneDayChange: change, oneDayChangePercent: changePercent };
    }

    return changes;
  }, [getPortfolioSnapshots, portfolioData]);

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

  // Merge 1-day changes into portfolio allocation data
  const portfolioAllocationWithPerformance = portfolioAllocationData.map(item => {
    const change = oneDayChanges[item.name];
    return {
      ...item,
      oneDayChange: change?.oneDayChange ?? 0,
      oneDayChangePercent: change?.oneDayChangePercent ?? 0,
    };
  });

  // Convert snapshots to performance chart data (only total investment, no portfolioId)
  const hasSnapshots = getPortfolioSnapshots && Array.isArray(getPortfolioSnapshots) && getPortfolioSnapshots.length > 0;
  const investmentSnapshots = hasSnapshots
    ? getPortfolioSnapshots.filter(s => !s.portfolioId)
    : [];
  const performanceData = investmentSnapshots.length > 0
    ? investmentSnapshots.map(snapshot => ({
        date: new Date(snapshot.snapshotDate).toLocaleDateString("en-GB", { month: "short", day: "numeric" }),
        value: snapshot.totalValue,
      }))
    : [];

  // Calculate YTD return from snapshots (investment only)
  const currentYear = new Date().getFullYear();
  const ytdData = investmentSnapshots.length > 0 && summary
    ? (() => {
        const yearStartSnapshot = investmentSnapshots.find(s => new Date(s.snapshotDate).getFullYear() === currentYear);
        const currentValue = summary.totalValue;
        if (yearStartSnapshot && yearStartSnapshot.totalValue > 0) {
          const ytdReturn = ((currentValue - yearStartSnapshot.totalValue) / yearStartSnapshot.totalValue) * 100;
          return ytdReturn;
        }
        return null;
      })()
    : null;

  const assetTypeData = calculateAssetTypeAllocation(summary.portfolios)
  const accountAllocationData = getAccountAllocationData(summary.portfolios)
  const treemapData = generateHoldingsTreemapData(summary.portfolios)

  // Reusable chart tooltips
  const CustomTooltip = ChartTooltip({})
  const PieTooltip = PieChartTooltip({})

  // Tooltip for percentage-based charts
  const PercentTooltip = ChartTooltip({
    formatter: (value: number) => `${value.toFixed(1)}%`,
  })

  return (
    <div className="flex min-h-screen bg-background">
      <main className="flex-1 overflow-y-auto bg-background">
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
                <div className={`text-2xl font-bold ${ytdData !== null && ytdData >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                  {ytdData !== null ? (ytdData >= 0 ? "+" : "") + ytdData.toFixed(1) + "%" : "—"}
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
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Performance
              </CardTitle>
              <CardDescription>{hasSnapshots ? "12-month history" : "Track your portfolio over time"}</CardDescription>
            </CardHeader>
            <CardContent>
              {hasSnapshots ? (
                <div className="[&_.recharts-cartesian-axis-tick_text]:!fill-muted-foreground">
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={performanceData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="valueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4F46E5" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#4F46E5" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="date"
                      stroke="hsl(var(--muted-foreground))"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "currentColor", fontSize: 12 }}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      tickFormatter={(value) => `£${(value / 1000).toFixed(0)}k`}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "currentColor", fontSize: 12 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#4F46E5"
                      strokeWidth={2.5}
                      dot={false}
                      fill="url(#valueGradient)"
                    />
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
                  >
                    {portfolioAllocationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              {/* Legend below donut with 1-day change */}
              <div className="flex flex-wrap justify-center gap-3 mt-2">
                {portfolioAllocationWithPerformance.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-muted-foreground">{entry.name}</span>
                    {entry.oneDayChangePercent !== 0 && (
                      <span className={entry.oneDayChangePercent >= 0 ? "text-green-600" : "text-red-600"}>
                        {entry.oneDayChangePercent >= 0 ? "+" : ""}{entry.oneDayChangePercent.toFixed(2)}%
                      </span>
                    )}
                  </div>
                ))}
              </div>
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
                  >
                    {accountAllocationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-3 mt-2">
                {accountAllocationData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-muted-foreground">{entry.name}</span>
                  </div>
                ))}
              </div>
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
                <BarChart data={assetTypeData} barGap={8} barCategoryGap="30%">
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
                    barSize={60}
                    barCategoryGap="20%"
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
