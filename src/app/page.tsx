"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TrendingUp, TrendingDown, Wallet, PieChartIcon, BarChart3 } from "lucide-react"
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
  ResponsiveContainer,
} from "recharts"
import { calculatePortfolioSummary, getAccountAllocationData, generateMockPerformanceData, normalizePortfolios, calculateAssetTypeAllocation } from "../lib/calculatePortfolioOverview"
import { api } from "../../convex/_generated/api"
import { useQuery } from "convex/react"
import { isError, isPortfolioArray } from "@/types/portfolios"

// Color palette matching design inspiration
const COLORS = ["#4F46E5", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"]

export default function PortfolioOverview() {
  const getPortfolioData = useQuery(api.portfolio.getUserPortfolio.getUserPortfolio, {});

  if (!getPortfolioData) { return <div>Loading portfolio…</div>; } 
  
  if (isError(getPortfolioData)) { return <div>Error: {getPortfolioData.error}</div>; } 
  
  if (!isPortfolioArray(getPortfolioData)) { return <div>Error: Unexpected response format.</div>; }

  const portfolioSummary = calculatePortfolioSummary(normalizePortfolios(getPortfolioData))
  const allocationData = getAccountAllocationData(portfolioSummary.portfolios)
  const performanceData = generateMockPerformanceData(portfolioSummary.totalValue)
  const assetTypeData = calculateAssetTypeAllocation(portfolioSummary.portfolios)
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-balance">Portfolio Overview</h1>
            <p className="text-muted-foreground mt-2">Track your investments across all accounts</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Total Portfolio Value</div>
            <div className="text-4xl font-bold">
              ${portfolioSummary.totalValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
            <div
              className={`flex items-center gap-1 justify-end mt-1 ${portfolioSummary.totalChangePercent >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              {portfolioSummary.totalChangePercent >= 0 ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span className="font-semibold">
                ${Math.abs(portfolioSummary.totalChange).toLocaleString("en-US", { minimumFractionDigits: 2 })} (
                {portfolioSummary.totalChangePercent >= 0 ? "+" : ""}
                {portfolioSummary.totalChangePercent.toFixed(2)}%)
              </span>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Portfolio Performance */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Portfolio Performance</CardTitle>
              <CardDescription>12-month performance history</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, "Value"]}
                  />
                  <Line type="monotone" dataKey="value" stroke="#4F46E5" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Account Allocation */}
          <Card>
            <CardHeader>
              <CardTitle>Account Allocation</CardTitle>
              <CardDescription>Distribution by account</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={allocationData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name.split(" ")[0]} ${(percent * 100).toFixed(0)}%`}
                  >
                    {allocationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, "Value"]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Asset Type Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Asset Distribution</CardTitle>
              <CardDescription>Breakdown by asset type</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={assetTypeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={(value) => `${value}%`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                    formatter={(value: number) => [`${value}%`, "Allocation"]}
                  />
                  <Bar dataKey="value" fill="#4F46E5" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Wallet className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Total Accounts</div>
                    <div className="text-2xl font-bold">{portfolioSummary.portfolios.length}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10">
                    <PieChartIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Total Holdings</div>
                    <div className="text-2xl font-bold">
                      {portfolioSummary.portfolios.reduce((acc, portfolio) => acc + portfolio.holdings.length, 0)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10">
                    <BarChart3 className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">YTD Return</div>
                    <div
                      className={`text-2xl font-bold ${portfolioSummary.totalChangePercent >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      {portfolioSummary.totalChangePercent >= 0 ? "+" : ""}
                      {portfolioSummary.totalChangePercent.toFixed(2)}%
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Account Details */}
        <Card>
          <CardHeader>
            <CardTitle>Account Holdings</CardTitle>
            <CardDescription>Detailed view of holdings across all accounts</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={portfolioSummary.portfolios[0]?.id} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                {portfolioSummary.portfolios.map((portfolio) => (
                  <TabsTrigger key={portfolio.id} value={portfolio.id}>
                    {portfolio.name}
                  </TabsTrigger>
                ))}
              </TabsList>
              {portfolioSummary.portfolios.map((portfolio) => (
                <TabsContent key={portfolio.id} value={portfolio.id} className="space-y-4">
                  {/* Account Summary */}
                  <div className="flex items-center justify-between rounded-lg border bg-card p-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold">{portfolio.name}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{portfolio.holdings.length} holdings</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">
                        ${portfolio.value.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </div>
                      <div
                        className={`text-sm font-medium ${portfolio.changePercent >= 0 ? "text-green-600" : "text-red-600"}`}
                      >
                        {portfolio.changePercent >= 0 ? "+" : ""}$
                        {portfolio.change.toLocaleString("en-US", { minimumFractionDigits: 2 })} (
                        {portfolio.changePercent >= 0 ? "+" : ""}
                        {portfolio.changePercent.toFixed(2)}%)
                      </div>
                    </div>
                  </div>

                  {/* Holdings Table */}
                  <div className="rounded-lg border">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="px-4 py-3 text-left text-sm font-medium">Symbol</th>
                            <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                            <th className="px-4 py-3 text-right text-sm font-medium">Shares</th>
                            <th className="px-4 py-3 text-right text-sm font-medium">Avg Price</th>
                            <th className="px-4 py-3 text-right text-sm font-medium">Current Price</th>
                            <th className="px-4 py-3 text-right text-sm font-medium">Market Value</th>
                            <th className="px-4 py-3 text-right text-sm font-medium">Gain/Loss</th>
                            <th className="px-4 py-3 text-left text-sm font-medium">Purchase Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {portfolio.holdings.map((holding) => (
                            <tr key={holding._id} className="border-b last:border-0 hover:bg-muted/30">
                              <td className="px-4 py-3 font-mono font-semibold">{holding.symbol}</td>
                              <td className="px-4 py-3 text-sm">{holding.name}</td>
                              <td className="px-4 py-3 text-right">{holding.shares}</td>
                              <td className="px-4 py-3 text-right">${holding.avgPrice.toFixed(2)}</td>
                              <td className="px-4 py-3 text-right">${holding.currentPrice.toFixed(2)}</td>
                              <td className="px-4 py-3 text-right font-semibold">
                                ${holding.marketValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                              </td>
                              <td
                                className={`px-4 py-3 text-right font-semibold ${holding.gainLoss >= 0 ? "text-green-600" : "text-red-600"}`}
                              >
                                {holding.gainLoss >= 0 ? "+" : ""}$
                                {holding.gainLoss.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                <span className="text-xs ml-1">
                                  ({holding.gainLoss >= 0 ? "+" : ""}
                                  {holding.gainLossPercent.toFixed(2)}%)
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-muted-foreground">{holding.purchaseDate}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
