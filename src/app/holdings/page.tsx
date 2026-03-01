"use client"

import { useEffect, useState, useMemo, useRef, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Plus, X, LineChart as LineChartIcon } from "lucide-react"
import { Holding, SimpleHolding, isError, isPortfolioArray, Portfolio } from "@/types/portfolios"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { RefreshButton } from "@/components/RefreshHoldingsButton"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, LineChart, Line, CartesianGrid, XAxis, YAxis } from "recharts"
import { CHART_COLORS, DONUT_INNER_RADIUS, DONUT_OUTER_RADIUS } from "@/lib/constants"
import { getPriceInPounds } from "@/lib/utils"
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock"
import { PieChartTooltip, ChartTooltip } from "@/components/chart-tooltip"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

type PortfolioExpanded = {
  portfolio: Portfolio
  id: string
}

type TimelineRange = "1D" | "1W" | "1M" | "YTD" | "1Y";

export default function HoldingsPage() {
  const getPortfolioData = useQuery(api.portfolio.getUserPortfolio.getUserPortfolio, {});
  const updatePortfolioMutation = useMutation(api.portfolio.updateUserPortfolio.updateUserPortfolio);
  const getPortfolioSnapshots = useQuery(api.portfolio.portfolioSnapshots.getPortfolioSnapshots, { months: 12 });

  const [portfolios, setPortfolios] = useState<PortfolioExpanded[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [simpleHoldings, setSimpleHoldings] = useState<SimpleHolding[]>([]);
  const [showNewPortfolioForm, setShowNewPortfolioForm] = useState(false);
  const [newPortfolioName, setNewPortfolioName] = useState("");
  const [newPortfolioType, setNewPortfolioType] = useState<"live" | "manual">("live");
  const [isSaving, setIsSaving] = useState(false);
  const [sortBy, setSortBy] = useState<"date" | "value">("date");
  const [valueFilter, setValueFilter] = useState<"all" | "0-1000" | "1000-10000" | "10000-50000" | "50000+">("all");
  const [selectedTimeline, setSelectedTimeline] = useState<TimelineRange>("1M");
  const [performanceModalPortfolioId, setPerformanceModalPortfolioId] = useState<string | null>(null);

  const initialized = useRef(false);
  useEffect(() => {
    if (
      getPortfolioData &&
      isPortfolioArray(getPortfolioData) &&
      !initialized.current
    ) {
      initialized.current = true;
      const initialPortfolios = getPortfolioData.map((p) => ({
        portfolio: p,
        id: p._id,
      }));

      setPortfolios(initialPortfolios);
      setHoldings(getPortfolioData.flatMap((p) => p.holdings));
      setSimpleHoldings(getPortfolioData.flatMap((p) => p.simpleHoldings || []));
    }
  }, [getPortfolioData]);

  // Prevent body scroll when modal is open
  useBodyScrollLock(showNewPortfolioForm)

  // Reusable pie chart tooltip
  const PieTooltip = PieChartTooltip({})

  // Calculate portfolio totals
  const getPortfolioStats = useCallback((portfolioId: string, portfolioType?: "live" | "manual") => {
    if (portfolioType === "manual") {
      const portfolioSimpleHoldings = simpleHoldings.filter((h) => h.portfolioId === portfolioId)
      const totalValue = portfolioSimpleHoldings.reduce((sum, h) => sum + h.value, 0)
      return { totalValue, totalCost: 0, totalGain: 0, totalGainPercent: 0 }
    } else {
      const portfolioHoldings = holdings.filter((h) => h.portfolioId === portfolioId)
      const totalValue = portfolioHoldings.reduce((sum, h) => sum + getPriceInPounds(h.shares * h.currentPrice, h.currency || "GBP"), 0)
      const totalCost = portfolioHoldings.reduce((sum, h) => sum + getPriceInPounds(h.shares * h.avgPrice, h.currency || "GBP"), 0)
      const totalGain = totalValue - totalCost
      const totalGainPercent = totalCost > 0 ? (totalGain / totalCost) * 100 : 0
      return { totalValue, totalCost, totalGain, totalGainPercent }
    }
  }, [holdings, simpleHoldings])

  // Calculate allocation data for pie chart - aggregates duplicates by name
  const getPortfolioAllocationData = (portfolioId: string, portfolioType?: "live" | "manual") => {
    if (portfolioType === "manual") {
      const portfolioSimpleHoldings = simpleHoldings.filter((h) => h.portfolioId === portfolioId)
      const rawData = portfolioSimpleHoldings.map((holding) => ({
        name: holding.name || "Unknown",
        value: holding.value,
      })).filter(item => item.value > 0)

      // Aggregate by name to handle duplicates
      const aggregated = rawData.reduce((acc, item) => {
        if (acc[item.name]) {
          acc[item.name].value += item.value;
        } else {
          acc[item.name] = { ...item };
        }
        return acc;
      }, {} as Record<string, { name: string; value: number }>);

      return Object.values(aggregated);
    } else {
      const portfolioHoldings = holdings.filter((h) => h.portfolioId === portfolioId)
      const rawData = portfolioHoldings.map((holding) => {
        const currency = holding.currency || "GBP";
        const marketValue = getPriceInPounds(holding.shares * holding.currentPrice, currency);
        return {
          name: holding.symbol || holding.name || "Unknown",
          value: marketValue,
        }
      }).filter(item => item.value > 0)

      // Aggregate by name to handle duplicates
      const aggregated = rawData.reduce((acc, item) => {
        if (acc[item.name]) {
          acc[item.name].value += item.value;
        } else {
          acc[item.name] = { ...item };
        }
        return acc;
      }, {} as Record<string, { name: string; value: number }>);

      return Object.values(aggregated);
    }
  }

  // Sort and filter portfolios - MUST be called before any early returns
  const sortedAndFilteredPortfolios = useMemo(() => {
    let filtered = portfolios.map((p) => {
      const stats = getPortfolioStats(p.id, p.portfolio.portfolioType);
      return { ...p, stats };
    });

    // Apply value filter
    if (valueFilter !== "all") {
      filtered = filtered.filter((p) => {
        const value = p.stats.totalValue;
        switch (valueFilter) {
          case "0-1000":
            return value >= 0 && value < 1000;
          case "1000-10000":
            return value >= 1000 && value < 10000;
          case "10000-50000":
            return value >= 10000 && value < 50000;
          case "50000+":
            return value >= 50000;
          default:
            return true;
        }
      });
    }

    // Sort portfolios
    filtered.sort((a, b) => {
      if (sortBy === "date") {
        // Sort by lastUpdated (newest first)
        const dateA = a.portfolio.lastUpdated ? new Date(a.portfolio.lastUpdated).getTime() : 0;
        const dateB = b.portfolio.lastUpdated ? new Date(b.portfolio.lastUpdated).getTime() : 0;
        // If both have dates, sort by date, otherwise keep original order
        if (dateA > 0 && dateB > 0) {
          return dateB - dateA; // Newest first
        }
        // If one has a date and the other doesn't, prioritize the one with a date
        if (dateA > 0 && dateB === 0) return -1;
        if (dateB > 0 && dateA === 0) return 1;
        return 0; // Both have no date, keep original order
      } else {
        // Sort by value (highest first)
        return b.stats.totalValue - a.stats.totalValue;
      }
    });

    return filtered;
  }, [portfolios, valueFilter, sortBy, getPortfolioStats]);

  // Early returns AFTER all hooks
  if (!getPortfolioData) {
    return <LoadingSpinner fullScreen message="Loading portfolio..." />;
  }

  if (isError(getPortfolioData)) {
    return <div>Error: {getPortfolioData.error}</div>;
  }

  if (!isPortfolioArray(getPortfolioData)) {
    return <div>Error: Unexpected response format.</div>;
  }

  // Add new portfolio
  const addPortfolio = async () => {
    if (!newPortfolioName.trim()) {
      alert("Please enter a portfolio name");
      return;
    }

    setIsSaving(true);
    try {
      // Call the mutation to persist in Convex (no ID needed for new portfolio)
      const result = await updatePortfolioMutation({ 
        name: newPortfolioName,
        portfolioType: newPortfolioType
      });

      if (result && 'portfolioId' in result) {
        const newPortfolio: PortfolioExpanded = {
          portfolio: {
            _id: result.portfolioId as Id<"portfolios">,
            name: newPortfolioName,
            portfolioType: newPortfolioType,
            lastUpdated: new Date().toISOString()
          },
          id: result.portfolioId ?? "",
        };
        
        setPortfolios([...portfolios, newPortfolio]);
        setShowNewPortfolioForm(false);
        setNewPortfolioName("");
        setNewPortfolioType("live");
      }
    } catch (error) {
      console.error("Failed to create portfolio:", error);
      alert("Failed to create portfolio. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  // Update portfolio name
  const updatePortfolioName = async (portfolioId: string, name: string) => {
    setPortfolios(
      portfolios.map((p) =>
        p.id === portfolioId ? { ...p, portfolio: { ...p.portfolio, name, lastUpdated: new Date().toISOString() } } : p,
      ),
    );

    try {
      // Persist the name change to Convex
      await updatePortfolioMutation({ 
        id: portfolioId as Id<"portfolios">, 
        name 
      });
    } catch (error) {
      console.error("Failed to update portfolio name:", error);
      alert("Failed to update portfolio name. Please try again.");
    }
  }

  return (
    <div className="flex h-screen bg-background">
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
            {/* Filters */}
            {portfolios.length > 0 && (
              <div className="flex items-center gap-2 bg-muted/50 p-1.5 rounded-lg">
                <Select value={sortBy} onValueChange={(value: "date" | "value") => setSortBy(value)}>
                  <SelectTrigger className="w-[130px] h-8 border-0 bg-transparent shadow-none focus:ring-0">
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Created Date</SelectItem>
                    <SelectItem value="value">Market Value</SelectItem>
                  </SelectContent>
                </Select>
                <div className="w-px h-6 bg-border" />
                <Select value={valueFilter} onValueChange={(value: "all" | "0-1000" | "1000-10000" | "10000-50000" | "50000+") => setValueFilter(value)}>
                  <SelectTrigger className="w-[160px] h-8 border-0 bg-transparent shadow-none focus:ring-0">
                    <SelectValue placeholder="Filter by value" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Values</SelectItem>
                    <SelectItem value="0-1000">£0 - £1,000</SelectItem>
                    <SelectItem value="1000-10000">£1,000 - £10,000</SelectItem>
                    <SelectItem value="10000-50000">£10,000 - £50,000</SelectItem>
                    <SelectItem value="50000+">£50,000+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {/* Buttons */}
            <div className="flex items-center gap-2">
              <RefreshButton />
              <Button
                onClick={() => setShowNewPortfolioForm(true)}
                className="gap-2 h-8"
              >
                <Plus className="h-4 w-4" />
                Add Portfolio
              </Button>
            </div>
          </div>

          {/* New Portfolio Form Modal */}
          {showNewPortfolioForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
              <Card className="w-full max-w-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                  <h2 className="text-xl font-semibold">Create New Portfolio</h2>
                  <button
                    onClick={() => {
                      setShowNewPortfolioForm(false);
                      setNewPortfolioName("");
                    }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Portfolio Name</label>
                    <Input
                      placeholder="e.g., Retirement Fund, Savings, Growth Portfolio"
                      value={newPortfolioName}
                      onChange={(e) => setNewPortfolioName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          addPortfolio();
                        }
                      }}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Portfolio Type</label>
                    <Select value={newPortfolioType} onValueChange={(value: "live" | "manual") => setNewPortfolioType(value)}>
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="live">Live (API-tracked)</SelectItem>
                        <SelectItem value="manual">Manual (Pensions, OICS, etc.)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      {newPortfolioType === "live" 
                        ? "For portfolios with tickers that can be tracked via API"
                        : "For portfolios like pensions or OICS that you'll update manually"}
                    </p>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowNewPortfolioForm(false);
                        setNewPortfolioName("");
                        setNewPortfolioType("live");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button onClick={addPortfolio} disabled={isSaving || !newPortfolioName.trim()}>
                      {isSaving ? "Creating..." : "Create Portfolio"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedAndFilteredPortfolios.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Plus className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-lg font-medium mb-2">
                    {portfolios.length === 0
                      ? "No portfolios yet"
                      : "No portfolios match your filters"}
                  </p>
                  <p className="text-muted-foreground mb-6 text-center max-w-md">
                    {portfolios.length === 0
                      ? "Create your first portfolio to start tracking your investments."
                      : "Try adjusting your filter criteria to see more portfolios."}
                  </p>
                  {portfolios.length === 0 && (
                    <Button onClick={() => setShowNewPortfolioForm(true)} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Create Portfolio
                    </Button>
                  )}
                  {portfolios.length > 0 && valueFilter !== "all" && (
                    <Button variant="outline" onClick={() => setValueFilter("all")} className="gap-2">
                      Clear Filters
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              sortedAndFilteredPortfolios.map((portfolioExpanded) => {
                const isManual = portfolioExpanded.portfolio.portfolioType === "manual";
                const portfolioHoldings = holdings.filter((h) => h.portfolioId === portfolioExpanded.id)
                const portfolioSimpleHoldings = simpleHoldings.filter((h) => h.portfolioId === portfolioExpanded.id)
                const allocationData = getPortfolioAllocationData(portfolioExpanded.id, portfolioExpanded.portfolio.portfolioType)

                return (
                  <Card key={portfolioExpanded.id} className="flex flex-col hover:shadow-lg transition-shadow duration-200">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              isManual
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                            }`}>
                              {isManual ? "Manual" : "Live"}
                            </span>
                            <Input
                              value={portfolioExpanded.portfolio.name}
                              onChange={(e) => updatePortfolioName(portfolioExpanded.id, e.target.value)}
                              className="border-none p-0 text-lg font-semibold shadow-none focus-visible:ring-0 bg-transparent"
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPerformanceModalPortfolioId(portfolioExpanded.id)}
                            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground -ml-2"
                          >
                            <LineChartIcon className="h-3 w-3 mr-1" />
                            Performance
                          </Button>
                          <CardDescription>
                            {isManual ? "Total Value" : "Market Value"}: <span className="font-semibold text-foreground">£{portfolioExpanded.stats.totalValue.toFixed(2)}</span>
                          </CardDescription>
                          {!isManual && (
                            <>
                              <CardDescription className="mt-0.5">
                                Cost: <span className="text-foreground">£{portfolioExpanded.stats.totalCost.toFixed(2)}</span>
                                <span className="mx-1">•</span>
                                Gain:{" "}
                                <span className={portfolioExpanded.stats.totalGain >= 0 ? "text-green-600" : "text-red-600"}>
                                  £{portfolioExpanded.stats.totalGain.toFixed(2)} ({portfolioExpanded.stats.totalGainPercent.toFixed(2)}%)
                                </span>
                              </CardDescription>
                              <CardDescription className="mt-0.5">
                                {portfolioHoldings.length} {portfolioHoldings.length === 1 ? "holding" : "holdings"}
                                {allocationData.length > 0 && (
                                  <>
                                    <span className="mx-1">•</span>
                                    Top: <span className="text-foreground">{allocationData[0].name}</span> ({((allocationData[0].value / portfolioExpanded.stats.totalValue) * 100).toFixed(1)}%)
                                  </>
                                )}
                              </CardDescription>
                            </>
                          )}
                          {isManual && (
                            <CardDescription className="mt-0.5">
                              {portfolioSimpleHoldings.length} {portfolioSimpleHoldings.length === 1 ? "holding" : "holdings"}
                              {allocationData.length > 0 && (
                                <>
                                  <span className="mx-1">•</span>
                                  Top: <span className="text-foreground">{allocationData[0].name}</span> ({((allocationData[0].value / portfolioExpanded.stats.totalValue) * 100).toFixed(1)}%)
                                </>
                              )}
                            </CardDescription>
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="flex-1 flex items-center justify-center">
                      {isManual ? (
                        portfolioSimpleHoldings.length === 0 ? (
                          <Link
                            href={`/holdings/${portfolioExpanded.id}`}
                            className="cursor-pointer hover:opacity-80 transition-opacity"
                          >
                            <div className="py-8 text-center text-muted-foreground hover:text-foreground">
                              No holdings in this portfolio yet.
                              <div className="mt-4 text-sm font-medium">Click to add holdings</div>
                            </div>
                          </Link>
                        ) : allocationData.length === 0 ? (
                          <Link
                            href={`/holdings/${portfolioExpanded.id}`}
                            className="cursor-pointer hover:opacity-80 transition-opacity"
                          >
                            <div className="py-8 text-center text-muted-foreground hover:text-foreground">
                              No holdings with value in this portfolio.
                              <div className="mt-4 text-sm font-medium">Click to manage holdings</div>
                            </div>
                          </Link>
                        ) : (
                          <Link
                            href={`/holdings/${portfolioExpanded.id}`}
                            className="w-full cursor-pointer hover:opacity-80 transition-opacity"
                          >
                            <ResponsiveContainer width="100%" height={220}>
                              <PieChart>
                                <Pie
                                  data={allocationData}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={DONUT_INNER_RADIUS}
                                  outerRadius={DONUT_OUTER_RADIUS}
                                  paddingAngle={3}
                                  cornerRadius={8}
                                  dataKey="value"
                                >
                                  {allocationData.map((item, index) => (
                                    <Cell key={item.name} fill={CHART_COLORS[index % CHART_COLORS.length]} stroke="none" />
                                  ))}
                                </Pie>
                                <RechartsTooltip content={PieTooltip} />
                              </PieChart>
                            </ResponsiveContainer>
                            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-3 px-2">
                              {allocationData.slice(0, 5).map((item, index) => (
                                <div key={item.name} className="flex items-center gap-1.5 text-xs">
                                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                                  <span className="text-muted-foreground">{item.name}</span>
                                </div>
                              ))}
                            </div>
                          </Link>
                        )
                      ) : portfolioHoldings.length === 0 ? (
                        <Link
                          href={`/holdings/${portfolioExpanded.id}`}
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                        >
                          <div className="py-8 text-center text-muted-foreground hover:text-foreground">
                            No holdings in this portfolio yet.
                            <div className="mt-4 text-sm font-medium">Click to add holdings</div>
                          </div>
                        </Link>
                      ) : allocationData.length === 0 ? (
                        <Link
                          href={`/holdings/${portfolioExpanded.id}`}
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                        >
                          <div className="py-8 text-center text-muted-foreground hover:text-foreground">
                            No holdings with market value in this portfolio.
                            <div className="mt-4 text-sm font-medium">Click to manage holdings</div>
                          </div>
                        </Link>
                      ) : (
                        <Link
                          href={`/holdings/${portfolioExpanded.id}`}
                          className="w-full cursor-pointer hover:opacity-80 transition-opacity"
                        >
                          <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                              <Pie
                                data={allocationData}
                                cx="50%"
                                cy="50%"
                                innerRadius={DONUT_INNER_RADIUS}
                                outerRadius={DONUT_OUTER_RADIUS}
                                paddingAngle={3}
                                cornerRadius={8}
                                dataKey="value"
                              >
                                {allocationData.map((item, index) => (
                                  <Cell key={item.name} fill={CHART_COLORS[index % CHART_COLORS.length]} stroke="none" />
                                ))}
                              </Pie>
                              <RechartsTooltip content={PieTooltip} />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-3 px-2">
                            {allocationData.slice(0, 5).map((item, index) => (
                              <div key={item.name} className="flex items-center gap-1.5 text-xs">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                                <span className="text-muted-foreground">{item.name}</span>
                              </div>
                            ))}
                          </div>
                        </Link>
                      )}
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>

          {/* Performance Modal */}
          <Dialog open={!!performanceModalPortfolioId} onOpenChange={(open) => !open && setPerformanceModalPortfolioId(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader className="pb-2">
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <LineChartIcon className="h-5 w-5 text-primary" />
                  {performanceModalPortfolioId
                    ? portfolios.find(p => p.id === performanceModalPortfolioId)?.portfolio.name
                    : "Portfolio Performance"}
                </DialogTitle>
              </DialogHeader>
              {performanceModalPortfolioId && (() => {
                const snapshots = (getPortfolioSnapshots && !('error' in getPortfolioSnapshots))
                  ? getPortfolioSnapshots.filter(s => s.portfolioId === performanceModalPortfolioId)
                  : [];
                const hasData = snapshots.length > 0;

                // Calculate period return
                let periodReturn = 0;
                let periodReturnPercent = 0;
                let currentValue = 0;
                let periodHigh = 0;
                let periodLow = Infinity;
                if (hasData && snapshots.length >= 2) {
                  const firstValue = snapshots[0].totalValue;
                  const lastValue = snapshots[snapshots.length - 1].totalValue;
                  periodReturn = lastValue - firstValue;
                  periodReturnPercent = firstValue > 0 ? (periodReturn / firstValue) * 100 : 0;
                  currentValue = lastValue;
                  snapshots.forEach(s => {
                    if (s.totalValue > periodHigh) periodHigh = s.totalValue;
                    if (s.totalValue < periodLow) periodLow = s.totalValue;
                  });
                } else if (hasData) {
                  currentValue = snapshots[0].totalValue;
                  periodHigh = snapshots[0].totalValue;
                  periodLow = snapshots[0].totalValue;
                }

                const chartData = snapshots.map(s => ({
                  date: new Date(s.snapshotDate).toLocaleDateString("en-GB", { month: "short", day: "numeric" }),
                  value: s.totalValue,
                }));

                const CustomTooltip = ChartTooltip({});

                return (
                  <div className="space-y-4">
                    {/* Stats cards */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg p-3 border border-primary/20">
                        <div className="text-xs text-muted-foreground mb-1">Current Value</div>
                        <div className="text-lg font-bold">£{currentValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      </div>
                      <div className={`rounded-lg p-3 border ${periodReturn >= 0 ? "bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20" : "bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20"}`}>
                        <div className="text-xs text-muted-foreground mb-1">Period Return</div>
                        <div className={`text-lg font-bold ${periodReturn >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {periodReturn >= 0 ? "+" : ""}£{periodReturn.toFixed(2)}
                        </div>
                        <div className={`text-xs ${periodReturn >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {periodReturnPercent >= 0 ? "+" : ""}{periodReturnPercent.toFixed(2)}%
                        </div>
                      </div>
                      <div className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 rounded-lg p-3 border border-amber-500/20">
                        <div className="text-xs text-muted-foreground mb-1">Period Range</div>
                        <div className="text-sm font-semibold">£{periodLow.toLocaleString("en-US", { minimumFractionDigits: 0 })} - £{periodHigh.toLocaleString("en-US", { minimumFractionDigits: 0 })}</div>
                      </div>
                    </div>

                    {/* Timeline selector */}
                    <div className="flex items-center gap-1 justify-center bg-muted/50 rounded-lg p-1">
                      {(["1D", "1W", "1M", "YTD", "1Y"] as TimelineRange[]).map((range) => (
                        <Button
                          key={range}
                          variant={selectedTimeline === range ? "default" : "ghost"}
                          size="sm"
                          onClick={() => setSelectedTimeline(range)}
                          className={`h-8 px-4 text-xs font-medium ${selectedTimeline === range ? "shadow-sm" : "text-muted-foreground"}`}
                        >
                          {range}
                        </Button>
                      ))}
                    </div>

                    {/* Chart */}
                    {hasData ? (
                      <div className="relative">
                        <ResponsiveContainer width="100%" height={280}>
                          <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                              <linearGradient id="modalPortfolioValueGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#4F46E5" stopOpacity={0.4} />
                                <stop offset="100%" stopColor="#4F46E5" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                            <XAxis
                              dataKey="date"
                              stroke="hsl(var(--muted-foreground))"
                              tick={{ fontSize: 11 }}
                              tickLine={false}
                              axisLine={false}
                              dy={10}
                            />
                            <YAxis
                              stroke="hsl(var(--muted-foreground))"
                              tickFormatter={(value) => `£${(value / 1000).toFixed(0)}k`}
                              tick={{ fontSize: 11 }}
                              tickLine={false}
                              axisLine={false}
                              dx={-10}
                            />
                            <RechartsTooltip content={<CustomTooltip />} />
                            <Line
                              type="monotone"
                              dataKey="value"
                              stroke="#4F46E5"
                              strokeWidth={3}
                              dot={{ fill: "#4F46E5", strokeWidth: 0, r: 4 }}
                              activeDot={{ r: 6, fill: "#4F46E5" }}
                              fill="url(#modalPortfolioValueGradient)"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-[280px] flex flex-col items-center justify-center text-muted-foreground bg-muted/30 rounded-lg border-2 border-dashed">
                        <LineChartIcon className="h-12 w-12 mb-3 opacity-50" />
                        <p className="text-sm">No historical data for this portfolio yet.</p>
                        <p className="text-xs mt-1">Performance tracking starts after the first snapshot is saved.</p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </div>
  )
}
