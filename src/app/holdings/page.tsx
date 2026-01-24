"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, X } from "lucide-react"
import { Holding, SimpleHolding, isError, isPortfolioArray, Portfolio } from "@/types/portfolios"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { RefreshButton } from "@/components/RefreshHoldingsButton"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts"

const COLORS = ["#4F46E5", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4", "#EC4899", "#84CC16", "#F97316", "#6366F1"]

type PortfolioExpanded = {
  portfolio: Portfolio & { _id?: string; lastUpdated?: string }
  id: string
}

export default function HoldingsPage() {
  const getPortfolioData = useQuery(api.portfolio.getUserPortfolio.getUserPortfolio, {});
  const updatePortfolioMutation = useMutation(api.portfolio.updateUserPortfolio.updateUserPortfolio);
  const deletePortfolioMutation = useMutation(api.portfolio.deleteUserPortfolio.deleteUserPortfolio);

  const [portfolios, setPortfolios] = useState<PortfolioExpanded[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [simpleHoldings, setSimpleHoldings] = useState<SimpleHolding[]>([]);
  const [showNewPortfolioForm, setShowNewPortfolioForm] = useState(false);
  const [newPortfolioName, setNewPortfolioName] = useState("");
  const [newPortfolioType, setNewPortfolioType] = useState<"live" | "manual">("live");
  const [isSaving, setIsSaving] = useState(false);
  const [sortBy, setSortBy] = useState<"date" | "value">("date");
  const [valueFilter, setValueFilter] = useState<"all" | "0-1000" | "1000-10000" | "10000-50000" | "50000+">("all");

  useEffect(() => {
    if (
      getPortfolioData &&
      isPortfolioArray(getPortfolioData) &&
      portfolios.length === 0 &&
      holdings.length === 0
    ) {
      const initialPortfolios = getPortfolioData.map((p) => ({
        portfolio: p,
        id: p._id,
      }));

      setPortfolios(initialPortfolios);
      setHoldings(getPortfolioData.flatMap((p) => p.holdings));
      setSimpleHoldings(getPortfolioData.flatMap((p) => p.simpleHoldings || []));
    }
  }, [getPortfolioData, portfolios.length, holdings.length]);

  // Calculate portfolio totals
  const getPortfolioStats = (portfolioId: string, portfolioType?: "live" | "manual") => {
    if (portfolioType === "manual") {
      const portfolioSimpleHoldings = simpleHoldings.filter((h) => h.portfolioId === portfolioId)
      const totalValue = portfolioSimpleHoldings.reduce((sum, h) => sum + h.value, 0)
      return { totalValue, totalCost: 0, totalGain: 0, totalGainPercent: 0 }
    } else {
      const portfolioHoldings = holdings.filter((h) => h.portfolioId === portfolioId)
      const totalValue = portfolioHoldings.reduce((sum, h) => sum + h.shares * h.currentPrice, 0)
      const totalCost = portfolioHoldings.reduce((sum, h) => sum + h.shares * h.avgPrice, 0)
      const totalGain = totalValue - totalCost
      const totalGainPercent = totalCost > 0 ? (totalGain / totalCost) * 100 : 0
      return { totalValue, totalCost, totalGain, totalGainPercent }
    }
  }

  // Calculate allocation data for pie chart
  const getPortfolioAllocationData = (portfolioId: string, portfolioType?: "live" | "manual") => {
    if (portfolioType === "manual") {
      const portfolioSimpleHoldings = simpleHoldings.filter((h) => h.portfolioId === portfolioId)
      return portfolioSimpleHoldings.map((holding) => ({
        name: holding.name || "Unknown",
        value: holding.value,
        holding: holding
      })).filter(item => item.value > 0) // Only include holdings with value
    } else {
      const portfolioHoldings = holdings.filter((h) => h.portfolioId === portfolioId)
      return portfolioHoldings.map((holding) => {
        const marketValue = holding.shares * holding.currentPrice
        return {
          name: holding.symbol || holding.name || "Unknown",
          value: marketValue,
          holding: holding
        }
      }).filter(item => item.value > 0) // Only include holdings with value
    }
  }

  // Sort and filter portfolios - MUST be called before any early returns
  const sortedAndFilteredPortfolios = (() => {
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
  })();

  // Early returns AFTER all hooks
  if (!getPortfolioData) {
    return <div>Loading portfolio…</div>;
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


  // Delete portfolio
  const deletePortfolio = async (portfolioId: string) => {
    if (!confirm("Are you sure you want to delete this portfolio and all its holdings?")) {
      return;
    }

    setIsSaving(true);
    try {
      // Delete the portfolio itself
      await deletePortfolioMutation({ id: portfolioId as Id<"portfolios"> });

      setPortfolios(portfolios.filter((p) => p.id !== portfolioId))
      setHoldings(holdings.filter((h) => h.portfolioId !== portfolioId))
    } catch (error) {
      console.error("Failed to delete portfolio:", error);
      alert("Failed to delete portfolio. Please try again.");
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
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Holdings</h1>
              <p className="text-muted-foreground">
                Manage your investment portfolios and holdings
              </p>
            </div>
            <div className="flex items-center gap-2">
              <RefreshButton />
              <Button
                onClick={() => setShowNewPortfolioForm(true)}
                className="gap-2"
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

          {/* Filters and Sorting */}
          {portfolios.length > 0 && (
            <div className="mb-6 flex gap-4 items-center">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Sort by:</label>
                <Select value={sortBy} onValueChange={(value: "date" | "value") => setSortBy(value)}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Created Date</SelectItem>
                    <SelectItem value="value">Market Value</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Filter by value:</label>
                <Select value={valueFilter} onValueChange={(value: "all" | "0-1000" | "1000-10000" | "10000-50000" | "50000+") => setValueFilter(value)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Portfolios</SelectItem>
                    <SelectItem value="0-1000">£0 - £1,000</SelectItem>
                    <SelectItem value="1000-10000">£1,000 - £10,000</SelectItem>
                    <SelectItem value="10000-50000">£10,000 - £50,000</SelectItem>
                    <SelectItem value="50000+">£50,000+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {sortedAndFilteredPortfolios.length === 0 ? (
              <Card className="col-span-2">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <p className="mb-4 text-muted-foreground">
                    {portfolios.length === 0
                      ? "No portfolios yet. Create your first portfolio to get started."
                      : "No portfolios match the selected filters."}
                  </p>
                  {portfolios.length === 0 && (
                    <Button onClick={() => setShowNewPortfolioForm(true)} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add Portfolio
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
                  <Card key={portfolioExpanded.id} className="flex flex-col">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <Input
                            value={portfolioExpanded.portfolio.name}
                            onChange={(e) => updatePortfolioName(portfolioExpanded.id, e.target.value)}
                            className="mb-1 border-none p-0 text-xl font-semibold shadow-none focus-visible:ring-0"
                          />
                          <CardDescription>
                            {isManual ? "Total Value" : "Market Value"}: <span className="font-semibold text-foreground">£{portfolioExpanded.stats.totalValue.toFixed(2)}</span>
                          </CardDescription>
                          {!isManual && (
                            <CardDescription className="mt-1">
                              Gain:{" "}
                              <span className={portfolioExpanded.stats.totalGain >= 0 ? "text-green-600" : "text-red-600"}>
                                £{portfolioExpanded.stats.totalGain.toFixed(2)} ({portfolioExpanded.stats.totalGainPercent.toFixed(2)}%)
                              </span>
                            </CardDescription>
                          )}
                          {isManual && (
                            <CardDescription className="mt-1 text-xs">
                              Manual Portfolio • {portfolioSimpleHoldings.length} {portfolioSimpleHoldings.length === 1 ? "holding" : "holdings"}
                            </CardDescription>
                          )}
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => deletePortfolio(portfolioExpanded.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
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
                          <div className="py-8 text-center text-muted-foreground">
                            No holdings with value in this portfolio.
                          </div>
                        ) : (
                          <Link 
                            href={`/holdings/${portfolioExpanded.id}`}
                            className="w-full cursor-pointer hover:opacity-80 transition-opacity"
                          >
                            <ResponsiveContainer width="100%" height={250}>
                              <PieChart>
                                <Pie
                                  data={allocationData}
                                  cx="50%"
                                  cy="50%"
                                  outerRadius={80}
                                  paddingAngle={2}
                                  cornerRadius={6}
                                  dataKey="value"
                                  labelLine={false}
                                  label={({ name, percent }) =>
                                    `${name} ${(percent * 100).toFixed(0)}%`
                                  }
                                >
                                  {allocationData.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                  ))}
                                </Pie>
                                <RechartsTooltip
                                  content={({ active, payload }) => {
                                    if (!active || !payload?.length) return null;
                                    const { name, value } = payload[0].payload;
                                    return (
                                      <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg text-sm">
                                        <div className="font-semibold">{name}</div>
                                        <div>£{value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                      </div>
                                    );
                                  }}
                                />
                              </PieChart>
                            </ResponsiveContainer>
                          </Link>
                        )
                      ) : portfolioHoldings.length === 0 ? (
                        <div className="py-8 text-center text-muted-foreground">
                          No holdings in this portfolio yet.
                        </div>
                      ) : allocationData.length === 0 ? (
                        <div className="py-8 text-center text-muted-foreground">
                          No holdings with market value in this portfolio.
                        </div>
                      ) : (
                        <Link 
                          href={`/holdings/${portfolioExpanded.id}`}
                          className="w-full cursor-pointer hover:opacity-80 transition-opacity"
                        >
                          <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                              <Pie
                                data={allocationData}
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                paddingAngle={2}
                                cornerRadius={6}
                                dataKey="value"
                                labelLine={false}
                                label={({ name, percent }) =>
                                  `${name} ${(percent * 100).toFixed(0)}%`
                                }
                              >
                                {allocationData.map((_, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <RechartsTooltip
                                content={({ active, payload }) => {
                                  if (!active || !payload?.length) return null;
                                  const { name, value } = payload[0].payload;
                                  return (
                                    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg text-sm">
                                      <div className="font-semibold">{name}</div>
                                      <div>£{value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                    </div>
                                  );
                                }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </Link>
                      )}
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
