"use client"

import { useEffect, useState, useMemo, useRef, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Plus, X, LineChart as LineChartIcon, TrendingUp, TrendingDown, Wallet, PieChart as PieChartIcon, Building2, Filter, ArrowUpDown, Search, Check, Loader2 } from "lucide-react"
import { Holding, SimpleHolding, isError, isPortfolioArray, Portfolio } from "@/types/portfolios"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { RefreshButton } from "@/components/RefreshHoldingsButton"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, LineChart, Line, CartesianGrid, XAxis, YAxis } from "recharts"
import { CHART_COLORS, DONUT_INNER_RADIUS, DONUT_OUTER_RADIUS } from "@/lib/constants"
import { getPriceInPounds } from "@/lib/utils"
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock"
import { useToast } from "@/hooks/useToast"
import { PieChartTooltip, ChartTooltip } from "@/components/chart-tooltip"
import { Skeleton, SkeletonCard, SkeletonCardHeader, SkeletonCardContent, SkeletonText, SkeletonList } from "@/components/ui/skeleton"

type PortfolioExpanded = {
  portfolio: Portfolio
  id: string
}

type TimelineRange = "1D" | "1W" | "1M" | "YTD" | "1Y";

export default function HoldingsPage() {
  const getPortfolioData = useQuery(api.portfolio.getUserPortfolio.getUserPortfolio, {});
  const updatePortfolioMutation = useMutation(api.portfolio.updateUserPortfolio.updateUserPortfolio);
  const getPortfolioSnapshots = useQuery(api.portfolio.portfolioSnapshots.getPortfolioSnapshots, { months: 12 });
  const { addToast } = useToast()

  const [portfolios, setPortfolios] = useState<PortfolioExpanded[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [simpleHoldings, setSimpleHoldings] = useState<SimpleHolding[]>([]);
  const [showNewPortfolioForm, setShowNewPortfolioForm] = useState(false);
  const [newPortfolioName, setNewPortfolioName] = useState("");
  const [newPortfolioType, setNewPortfolioType] = useState<"live" | "manual">("live");
  const [portfolioNameError, setPortfolioNameError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [sortBy, setSortBy] = useState<"date" | "value">(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('portfolio_sort_by');
      return (saved as "date" | "value") || "date";
    }
    return "date";
  });
  const [typeFilter, setTypeFilter] = useState<"all" | "live" | "manual">("all");
  const [accountFilter, setAccountFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTimeline, setSelectedTimeline] = useState<TimelineRange>("1M");
  const [performanceModalPortfolioId, setPerformanceModalPortfolioId] = useState<string | null>(null);
  const [savingPortfolioId, setSavingPortfolioId] = useState<string | null>(null);
  const [renamedPortfolioId, setRenamedPortfolioId] = useState<string | null>(null);

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

  // Persist sort preference
  useEffect(() => {
    localStorage.setItem('portfolio_sort_by', sortBy);
  }, [sortBy]);

  // Debounce ref for portfolio rename
  const debouncedUpdateRef = useRef<{ [key: string]: NodeJS.Timeout }>({});

  // Get unique account names from holdings
  const uniqueAccounts = useMemo(() => {
    const accounts = new Set<string>();
    holdings.forEach(h => {
      if (h.accountName) {
        accounts.add(h.accountName);
      }
    });
    return Array.from(accounts).sort();
  }, [holdings]);

  // Real-time validation for portfolio name
  useEffect(() => {
    if (!newPortfolioName.trim()) {
      setPortfolioNameError(null);
      return;
    }
    if (newPortfolioName.trim().length < 2) {
      setPortfolioNameError("Portfolio name must be at least 2 characters");
    } else if (newPortfolioName.trim().length > 50) {
      setPortfolioNameError("Portfolio name must be 50 characters or less");
    } else {
      setPortfolioNameError(null);
    }
  }, [newPortfolioName]);

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

  // Calculate total holdings value across all portfolios
  const totalHoldingsValue = useMemo(() => {
    return portfolios.reduce((sum, p) => {
      const stats = getPortfolioStats(p.id, p.portfolio.portfolioType)
      return sum + stats.totalValue
    }, 0)
  }, [portfolios, getPortfolioStats])

  const totalHoldingsCost = useMemo(() => {
    return portfolios.reduce((sum, p) => {
      if (p.portfolio.portfolioType === "manual") return sum
      const stats = getPortfolioStats(p.id, p.portfolio.portfolioType)
      return sum + stats.totalCost
    }, 0)
  }, [portfolios, getPortfolioStats])

  const totalHoldingsGain = totalHoldingsValue - totalHoldingsCost
  const totalHoldingsGainPercent = totalHoldingsCost > 0 ? (totalHoldingsGain / totalHoldingsCost) * 100 : 0
  const totalLivePortfolios = portfolios.filter(p => p.portfolio.portfolioType !== "manual").length
  const totalManualPortfolios = portfolios.filter(p => p.portfolio.portfolioType === "manual").length

  // Calculate allocation data for pie chart - aggregates duplicates by name
  const getPortfolioAllocationData = useCallback((portfolioId: string, portfolioType?: "live" | "manual") => {
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
  }, [holdings, simpleHoldings])

  // Sort and filter portfolios - MUST be called before any early returns
  const sortedAndFilteredPortfolios = useMemo(() => {
    let filtered = portfolios.map((p) => {
      const stats = getPortfolioStats(p.id, p.portfolio.portfolioType);
      return { ...p, stats };
    });

    // Apply type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter((p) => p.portfolio.portfolioType === typeFilter);
    }

    // Apply account filter - filter portfolios that have holdings with the selected account
    if (accountFilter !== "all") {
      filtered = filtered.filter((p) => {
        const portfolioHoldings = holdings.filter(h => h.portfolioId === p.id);
        return portfolioHoldings.some(h => h.accountName === accountFilter);
      });
    }

    // Apply search filter - filter by portfolio name or holding symbol/name
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((p) => {
        // Match portfolio name
        if (p.portfolio.name.toLowerCase().includes(term)) return true;
        // Match holdings
        const portfolioHoldings = holdings.filter(h => h.portfolioId === p.id);
        return portfolioHoldings.some(h => 
          h.symbol?.toLowerCase().includes(term) || 
          h.name.toLowerCase().includes(term)
        );
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
  }, [portfolios, typeFilter, accountFilter, searchTerm, sortBy, getPortfolioStats, holdings]);

  // Early returns AFTER all hooks
  if (!getPortfolioData) {
    return (
      <div className="flex min-h-screen bg-background">
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-background pr-4">
          <div className="p-4 lg:p-8 space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-2">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-96" />
              </div>
              <div className="flex gap-3">
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-10 w-32" />
              </div>
            </div>

            <div className="flex gap-3">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonCard key={i} className="h-[180px] p-6" />
              ))}
            </div>

            <SkeletonCard className="h-[500px] p-6">
              <SkeletonCardHeader className="pb-2">
                <SkeletonText lines={2} />
              </SkeletonCardHeader>
              <SkeletonCardContent>
                <SkeletonList count={6} />
              </SkeletonCardContent>
            </SkeletonCard>
          </div>
        </main>
      </div>
    );
  }

  if (isError(getPortfolioData)) {
    return <div>Error: {getPortfolioData.error}</div>;
  }

  if (!isPortfolioArray(getPortfolioData)) {
    return <div>Error: Unexpected response format.</div>;
  }

  // Add new portfolio
  const addPortfolio = async () => {
    if (!newPortfolioName.trim() || portfolioNameError) {
      return;
    }

    setIsSaving(true);
    try {
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
        setPortfolioNameError(null);
        addToast("success", `Portfolio "${newPortfolioName}" created successfully`);
      }
    } catch (error) {
      console.error("Failed to create portfolio:", error);
      setPortfolioNameError("Failed to create portfolio. Please try again.");
      addToast("error", "Failed to create portfolio. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  // Update portfolio name with debounce
  
  const updatePortfolioName = (portfolioId: string, name: string) => {
    setPortfolios(
      portfolios.map((p) =>
        p.id === portfolioId ? { ...p, portfolio: { ...p.portfolio, name, lastUpdated: new Date().toISOString() } } : p,
      ),
    );

    // Clear existing timeout for this portfolio
    if (debouncedUpdateRef.current[portfolioId]) {
      clearTimeout(debouncedUpdateRef.current[portfolioId]);
    }

    // Show saving indicator
    setSavingPortfolioId(portfolioId);

    // Debounce the API call
    debouncedUpdateRef.current[portfolioId] = setTimeout(async () => {
      try {
        await updatePortfolioMutation({ 
          id: portfolioId as Id<"portfolios">, 
          name 
        });
        setSavingPortfolioId(null);
        setRenamedPortfolioId(portfolioId);
        setTimeout(() => setRenamedPortfolioId(null), 2000);
      } catch (error) {
        console.error("Failed to update portfolio name:", error);
        setSavingPortfolioId(null);
        setPortfolioNameError("Failed to update portfolio name. Please try again.");
      }
    }, 500);
  }

  return (
    <div className="flex min-h-screen bg-background">
      <main className="flex-1 overflow-y-auto overflow-x-hidden bg-background pr-4">
        <div className="p-4 lg:p-8 space-y-6">
          {/* Header Section */}
          {portfolios.length > 0 && (
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Total Holdings Display */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-600/20">
                <Wallet className="w-7 h-7 text-white" />
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Total Holdings Value</div>
                <div className="text-4xl font-bold tracking-tight">
                  £{totalHoldingsValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {totalHoldingsGain >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-600" />
                  )}
                  <span className={`text-sm font-medium ${totalHoldingsGain >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {totalHoldingsGain >= 0 ? "+" : ""}£{totalHoldingsGain.toLocaleString("en-US", { minimumFractionDigits: 2 })} ({totalHoldingsGainPercent >= 0 ? "+" : ""}{totalHoldingsGainPercent.toFixed(1)}%)
                  </span>
                  <span className="text-sm text-muted-foreground">total gain</span>
                </div>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1 lg:max-w-3xl">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border border-blue-200/50 dark:border-blue-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Live Portfolios</span>
                </div>
                <div className="text-2xl font-bold">{totalLivePortfolios}</div>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20 border border-amber-200/50 dark:border-amber-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Wallet className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Manual Portfolios</span>
                </div>
                <div className="text-2xl font-bold">{totalManualPortfolios}</div>
              </div>
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 border border-emerald-200/50 dark:border-emerald-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Total Cost</span>
                </div>
                <div className="text-2xl font-bold">£{totalHoldingsCost.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20 border border-purple-200/50 dark:border-purple-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <PieChartIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-xs font-medium text-purple-600 dark:text-purple-400">Portfolios</span>
                </div>
                <div className="text-2xl font-bold">{portfolios.length}</div>
              </div>
            </div>
          </div>
          )}

          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                <Filter className="w-4 h-4" />
                Filters
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search holdings..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-[180px] h-9 pl-9 bg-background text-sm"
                />
              </div>
              <div className="flex items-center gap-1 bg-muted/50 dark:bg-muted/30 p-1 rounded-lg">
                <Select value={sortBy} onValueChange={(value: "date" | "value") => setSortBy(value)}>
                  <SelectTrigger className="w-[130px] h-9 border-0 bg-transparent shadow-none focus:ring-0 text-sm" aria-label="Sort by">
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Created Date</SelectItem>
                    <SelectItem value="value">Market Value</SelectItem>
                  </SelectContent>
                </Select>
                <div className="w-px h-5 bg-border" />
                <Select value={typeFilter} onValueChange={(value: "all" | "live" | "manual") => setTypeFilter(value)}>
                  <SelectTrigger className="w-[130px] h-9 border-0 bg-transparent shadow-none focus:ring-0 text-sm" aria-label="Filter by type">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="live">Live</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
                <div className="w-px h-5 bg-border" />
                <Select value={accountFilter} onValueChange={setAccountFilter}>
                  <SelectTrigger className="w-[150px] h-9 border-0 bg-transparent shadow-none focus:ring-0 text-sm" aria-label="Filter by account">
                    <SelectValue placeholder="All Accounts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Accounts</SelectItem>
                    {uniqueAccounts.map((account) => (
                      <SelectItem key={account} value={account}>{account}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <ArrowUpDown className="w-4 h-4" />
              </div>
              {(typeFilter !== "all" || accountFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setTypeFilter("all"); setAccountFilter("all"); }}
                  className="text-xs h-7 text-muted-foreground hover:text-foreground"
                >
                  Clear filters
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <RefreshButton />
              <Button onClick={() => setShowNewPortfolioForm(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Portfolio
              </Button>
            </div>
          </div>

          {/* New Portfolio Form Modal */}
          {showNewPortfolioForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <Card className="w-full max-w-md mx-4 shadow-2xl">
                <CardHeader className="pb-4 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                        <Wallet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold">Create New Portfolio</h2>
                        <p className="text-sm text-muted-foreground">Track a new investment portfolio</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        setShowNewPortfolioForm(false);
                        setNewPortfolioName("");
                      }}
                      className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg p-2 transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-5">
                  <div>
                    <label htmlFor="portfolio-name" className="text-sm font-medium">Portfolio Name</label>
                    <Input
                      id="portfolio-name"
                      placeholder="e.g., Retirement Fund, Growth Portfolio"
                      value={newPortfolioName}
                      onChange={(e) => setNewPortfolioName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          addPortfolio();
                        }
                      }}
                      className={`mt-1.5 ${portfolioNameError ? "border-destructive focus:border-destructive" : ""}`}
                      aria-invalid={!!portfolioNameError}
                    />
                    {portfolioNameError && (
                      <p className="text-xs text-destructive mt-1">{portfolioNameError}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="portfolio-type" className="text-sm font-medium">Portfolio Type</label>
                    <Select value={newPortfolioType} onValueChange={(value: "live" | "manual") => setNewPortfolioType(value)}>
                      <SelectTrigger id="portfolio-type" className="mt-1.5" aria-label="Select portfolio type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="live">Live (API-tracked)</SelectItem>
                        <SelectItem value="manual">Manual (Pensions, OICS, etc.)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      {newPortfolioType === "live" 
                        ? "For portfolios with tickers that can be tracked via API"
                        : "For portfolios like pensions or OICS that you'll update manually"}
                    </p>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setShowNewPortfolioForm(false);
                        setNewPortfolioName("");
                        setNewPortfolioType("live");
                        setPortfolioNameError(null);
                      }} 
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button onClick={addPortfolio} disabled={isSaving || !newPortfolioName.trim()} className="flex-1">
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
                  <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Wallet className="w-7 h-7 text-muted-foreground" />
                  </div>
                  <p className="text-lg font-semibold mb-2">
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
                  {portfolios.length > 0 && (typeFilter !== "all" || accountFilter !== "all") && (
                    <Button variant="outline" onClick={() => { setTypeFilter("all"); setAccountFilter("all"); }} className="gap-2">
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
                  <Card key={portfolioExpanded.id} className="flex flex-col hover:shadow-lg transition-all duration-200 !border-0 overflow-hidden gap-0 py-0">
                    {/* Card Header with gradient - full width banner */}
                    <div className={`px-4 py-3 rounded-t-xl -mt-0 ${isManual
                      ? "bg-gradient-to-r from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20"
                      : "bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20"
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            isManual
                              ? "bg-amber-200 text-amber-700 dark:bg-amber-800/50 dark:text-amber-300"
                              : "bg-blue-200 text-blue-700 dark:bg-blue-800/50 dark:text-blue-300"
                          }`}>
                            {isManual ? "Manual" : "Live"}
                          </span>
                          <Input
                            value={portfolioExpanded.portfolio.name}
                            onChange={(e) => updatePortfolioName(portfolioExpanded.id, e.target.value)}
                            style={{ backgroundColor: 'transparent', border: 'none' }}
                            className="border-none p-0 text-lg font-semibold shadow-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 bg-transparent min-w-[120px]"
                          />
                          {savingPortfolioId === portfolioExpanded.id && (
                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                          )}
                          {renamedPortfolioId === portfolioExpanded.id && (
                            <Check className="w-4 h-4 text-emerald-600" />
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPerformanceModalPortfolioId(portfolioExpanded.id)}
                          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                        >
                          <LineChartIcon className="h-3 w-3 mr-1" />
                          Performance
                        </Button>
                      </div>
                    </div>

                    {/* Value Section */}
                    <CardHeader className="pb-2 pt-2 px-4">
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm text-muted-foreground">
                          {isManual ? "Total Value" : "Market Value"}
                        </span>
                        <span className="text-2xl font-bold tracking-tight">
                          £{portfolioExpanded.stats.totalValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      {/* Holdings count - moved above cost basis and gain */}
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-muted-foreground">Holdings</span>
                        <span className="text-xs text-foreground">
                          {(isManual ? portfolioSimpleHoldings.length : portfolioHoldings.length)} {allocationData.length > 0 && (
                            <>
                              <span className="text-muted-foreground">•</span> Top: <span className="font-medium">{allocationData[0].name}</span> ({((allocationData[0].value / portfolioExpanded.stats.totalValue) * 100).toFixed(1)}%)
                            </>
                          )}
                        </span>
                      </div>
                      {!isManual && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Cost basis</span>
                          <span className="text-sm">£{portfolioExpanded.stats.totalCost.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      {!isManual && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Total gain</span>
                          <span className={`text-sm font-medium ${portfolioExpanded.stats.totalGain >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                            {portfolioExpanded.stats.totalGain >= 0 ? "+" : ""}£{portfolioExpanded.stats.totalGain.toLocaleString("en-US", { minimumFractionDigits: 2 })} ({portfolioExpanded.stats.totalGainPercent >= 0 ? "+" : ""}{portfolioExpanded.stats.totalGainPercent.toFixed(2)}%)
                          </span>
                        </div>
                      )}
                      {isManual && (
                        <>
                          <div className="flex items-center justify-between mt-1 invisible">
                            <span className="text-xs text-muted-foreground">Cost basis</span>
                            <span className="text-sm">£0.00</span>
                          </div>
                          <div className="flex items-center justify-between invisible">
                            <span className="text-xs text-muted-foreground">Total gain</span>
                            <span className="text-sm font-medium">£0.00 (0.00%)</span>
                          </div>
                        </>
                      )}
                    </CardHeader>

                    <CardContent className="flex-1 flex items-center justify-center pt-2 px-4 pb-5">
                      {isManual ? (
                        portfolioSimpleHoldings.length === 0 ? (
                          <div className="py-8 text-center">
                            <div className="text-muted-foreground mb-4">No holdings in this portfolio yet.</div>
                            <div className="flex flex-col sm:flex-row gap-2 justify-center">
                              <Link href={`/holdings/${portfolioExpanded.id}`}>
                                <Button size="sm" className="gap-1.5">
                                  <Plus className="h-4 w-4" />
                                  Add Holding
                                </Button>
                              </Link>
                              <Link href={`/holdings/${portfolioExpanded.id}`}>
                                <Button variant="outline" size="sm">
                                  View Portfolio
                                </Button>
                              </Link>
                            </div>
                          </div>
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
                            <ResponsiveContainer width="100%" height={200}>
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
                            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-1 px-2">
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
                        <div className="py-8 text-center">
                          <div className="text-muted-foreground mb-4">No holdings in this portfolio yet.</div>
                          <div className="flex flex-col sm:flex-row gap-2 justify-center">
                            <Link href={`/holdings/${portfolioExpanded.id}`}>
                              <Button size="sm" className="gap-1.5">
                                <Plus className="h-4 w-4" />
                                Add Holding
                              </Button>
                            </Link>
                            <Link href={`/holdings/${portfolioExpanded.id}`}>
                              <Button variant="outline" size="sm">
                                View Portfolio
                              </Button>
                            </Link>
                          </div>
                        </div>
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
                          <ResponsiveContainer width="100%" height={200}>
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
                          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-1 px-2">
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
            <DialogContent className="max-w-3xl">
              <DialogHeader className="pb-4">
                <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                  <LineChartIcon className="h-6 w-6 text-primary" />
                  {performanceModalPortfolioId
                    ? portfolios.find(p => p.id === performanceModalPortfolioId)?.portfolio.name
                    : "Portfolio Performance"}
                </DialogTitle>
                <DialogDescription className="text-base">
                  View historical performance data for this portfolio over time.
                </DialogDescription>
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
                  <div className="space-y-5">
                    {/* Stats cards */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-5 border border-primary/20">
                        <div className="text-sm text-muted-foreground mb-2">Current Value</div>
                        <div className="text-2xl font-bold">£{currentValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      </div>
                      <div className={`rounded-xl p-5 border ${periodReturn >= 0 ? "bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20" : "bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20"}`}>
                        <div className="text-sm text-muted-foreground mb-2">Period Return</div>
                        <div className="text-2xl font-bold leading-tight">
                          <span className={periodReturn >= 0 ? "text-green-600" : "text-red-600"}>
                            {periodReturn >= 0 ? "+" : ""}£{periodReturn.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className={`text-base mt-1 ${periodReturn >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {periodReturnPercent >= 0 ? "+" : ""}{periodReturnPercent.toFixed(2)}%
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 rounded-xl p-5 border border-amber-500/20">
                      <div className="text-sm text-muted-foreground mb-2">Period Range</div>
                      <div className="text-xl font-semibold">£{periodLow.toLocaleString("en-US", { minimumFractionDigits: 0 })} - £{periodHigh.toLocaleString("en-US", { minimumFractionDigits: 0 })}</div>
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
                      <div className="relative [&_.recharts-cartesian-axis-tick_text]:!fill-muted-foreground">
                        <ResponsiveContainer width="100%" height={320}>
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
                              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                              tickLine={false}
                              axisLine={false}
                              dy={10}
                            />
                            <YAxis
                              stroke="hsl(var(--muted-foreground))"
                              tickFormatter={(value) => `£${(value / 1000).toFixed(0)}k`}
                              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
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
                      <div className="h-[320px] flex flex-col items-center justify-center text-muted-foreground bg-muted/30 rounded-lg border-2 border-dashed">
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
