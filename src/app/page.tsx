"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, Wallet, PieChartIcon, BarChart3 } from "lucide-react"
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
import { calculatePortfolioSummary, normalizePortfolios, calculateAssetTypeAllocation, generateHoldingsTreemapData, getAccountAllocationData, getPortfolioAllocationData } from "../lib/calculatePortfolioOverview"
import { api } from "../../convex/_generated/api"
import { useQuery } from "convex/react"
import { isError, isPortfolioArray } from "@/types/portfolios"
import { CustomTreemap } from "@/components/customTreeMap/customTreeMap"
import { CHART_COLORS, CHART_COLORS_MAIN, DONUT_INNER_RADIUS, DONUT_OUTER_RADIUS } from "@/lib/constants"
import { ChartTooltip, PieChartTooltip } from "@/components/chart-tooltip"

const COLORS = CHART_COLORS_MAIN

export default function PortfolioOverview() {
  const getPortfolioData = useQuery(api.portfolio.getUserPortfolio.getUserPortfolio, {});
  const getPortfolioSnapshots = useQuery(api.portfolio.portfolioSnapshots.getPortfolioSnapshots, { months: 12 });

  if (!getPortfolioData) { return <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>; }

  if (isError(getPortfolioData)) { return <div>Error: {getPortfolioData.error}</div>; }

  if (!isPortfolioArray(getPortfolioData)) { return <div>Error: Unexpected response format.</div>; }

  const portfolioSummary = calculatePortfolioSummary(normalizePortfolios(getPortfolioData))
  const portfolioAllocationData = getPortfolioAllocationData(portfolioSummary.portfolios)

  // Convert snapshots to performance chart data
  const hasSnapshots = getPortfolioSnapshots && Array.isArray(getPortfolioSnapshots) && getPortfolioSnapshots.length > 0;
  const performanceData = hasSnapshots
    ? getPortfolioSnapshots.map(snapshot => ({
        date: new Date(snapshot.snapshotDate).toLocaleDateString("en-GB", { month: "short", day: "numeric" }),
        value: snapshot.totalValue,
      }))
    : [];

  // Calculate YTD return from snapshots
  const currentYear = new Date().getFullYear();
  const ytdData = hasSnapshots
    ? (() => {
        const yearStartSnapshot = getPortfolioSnapshots.find(s => new Date(s.snapshotDate).getFullYear() === currentYear);
        const currentValue = portfolioSummary.totalValue;
        if (yearStartSnapshot && yearStartSnapshot.totalValue > 0) {
          const ytdReturn = ((currentValue - yearStartSnapshot.totalValue) / yearStartSnapshot.totalValue) * 100;
          return ytdReturn;
        }
        return null;
      })()
    : null;

  const assetTypeData = calculateAssetTypeAllocation(portfolioSummary.portfolios)
  const accountAllocationData = getAccountAllocationData(portfolioSummary.portfolios)
  const treemapData = generateHoldingsTreemapData(portfolioSummary.portfolios)

  // Reusable chart tooltips
  const CustomTooltip = ChartTooltip({})
  const PieTooltip = PieChartTooltip({})

  // Tooltip for percentage-based charts
  const PercentTooltip = ChartTooltip({
    formatter: (value: number) => [`${value.toFixed(1)}%`, "Value"],
  })

  return (
    <div className="flex h-screen bg-background">
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
        {/* Header Row with Total Value and Quick Stats */}
        <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
          {/* Total Value - Left */}
          <div className="flex items-center gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Total Value</div>
              <div className="text-3xl font-bold">
                £{portfolioSummary.totalValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* Quick Stats - Right Side */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 border rounded-md px-4 py-2.5 min-w-[130px] bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
              <Wallet className="h-5 w-5 text-primary" />
              <div>
                <div className="text-xs text-muted-foreground">Accounts</div>
                <div className="text-2xl font-bold">{portfolioSummary.portfolios.length}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 border rounded-md px-4 py-2.5 min-w-[130px] bg-gradient-to-br from-emerald-500/5 to-transparent border-emerald-500/20">
              <PieChartIcon className="h-5 w-5 text-emerald-600" />
              <div>
                <div className="text-xs text-muted-foreground">Holdings</div>
                <div className="text-2xl font-bold">
                  {portfolioSummary.portfolios.reduce((acc, portfolio) => acc + portfolio.holdings.length, 0)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 border rounded-md px-4 py-2.5 min-w-[130px] bg-gradient-to-br from-blue-500/5 to-transparent border-blue-500/20">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              <div>
                <div className="text-xs text-muted-foreground">YTD</div>
                <div className={`text-2xl font-bold ${ytdData !== null && ytdData >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {ytdData !== null ? (ytdData >= 0 ? "+" : "") + ytdData.toFixed(2) + "%" : "—"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 border rounded-md px-4 py-2.5 min-w-[130px] bg-gradient-to-br from-violet-500/5 to-transparent border-violet-500/20">
              <TrendingUp className="h-5 w-5 text-violet-600" />
              <div>
                <div className="text-xs text-muted-foreground">Growth</div>
                <div className={`text-2xl font-bold ${portfolioSummary.totalChangePercent >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {portfolioSummary.totalChangePercent >= 0 ? "+" : ""}
                  {portfolioSummary.totalChangePercent.toFixed(2)}%
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid gap-6 lg:grid-cols-8">
          {/* Portfolio Performance - Line Chart */}
          <Card className="lg:col-span-5">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Performance</CardTitle>
              <CardDescription>{hasSnapshots ? "12-month history" : "Track your portfolio over time"}</CardDescription>
            </CardHeader>
            <CardContent>
              {hasSnapshots ? (
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
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      tickFormatter={(value) => `£${(value / 1000).toFixed(0)}k`}
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
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
              ) : (
                <div className="h-[280px] flex flex-col items-center justify-center text-center p-6">
                  <p className="text-muted-foreground">
                    No performance data yet. Visit the Holdings page to refresh prices.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Portfolio Split - Donut Chart */}
          <Card className="lg:col-span-3">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">By Portfolio</CardTitle>
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
              {/* Legend below donut */}
              <div className="flex flex-wrap justify-center gap-3 mt-2">
                {portfolioAllocationData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-muted-foreground">{entry.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Account Split - Donut Chart */}
          <Card className="lg:col-span-3">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">By Account</CardTitle>
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
              <CardTitle className="text-lg">Asset Allocation</CardTitle>
              <CardDescription>By type</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={assetTypeData} barGap={8} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    tickFormatter={(value) => `${value.toFixed(0)}%`}
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={PercentTooltip} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                    {assetTypeData.map((entry, index) => (
                      <Cell key={`cell-${entry.name}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Holdings Treemap */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Holdings</CardTitle>
            <CardDescription>Visual breakdown by value</CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ width: "100%", height: 450 }}>
              <CustomTreemap data={treemapData} colors={[...CHART_COLORS]} />
            </div>
          </CardContent>
        </Card>
        </div>
      </main>
    </div>
  )
}
