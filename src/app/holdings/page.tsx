"use client"

import { useEffect, useState, useMemo, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Wallet } from "lucide-react"
import { Holding, SimpleHolding, isError, isPortfolioArray, Portfolio } from "@/types/portfolios"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { useToast } from "@/hooks/useToast"
import { Skeleton, SkeletonCard, SkeletonCardHeader, SkeletonCardContent, SkeletonText, SkeletonList } from "@/components/ui/skeleton"
import { PortfolioHeader, FiltersBar, NewPortfolioModal, PortfolioCard, PerformanceModal } from "@/components/holdings"
import { validateField, commonRules } from "@/lib/validation"
import { getPriceInPounds } from "@/lib/utils"

type PortfolioExpanded = {
  portfolio: Portfolio
  id: string
}

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
  const [performanceModalPortfolioId, setPerformanceModalPortfolioId] = useState<string | null>(null);
  const [savingPortfolioId, setSavingPortfolioId] = useState<string | null>(null);
  const [renamedPortfolioId, setRenamedPortfolioId] = useState<string | null>(null);

  const initialized = useRef(false);
  useEffect(() => {
    if (getPortfolioData && isPortfolioArray(getPortfolioData)) {
      if (!initialized.current) {
        initialized.current = true;
      }
      const initialPortfolios = getPortfolioData.map((p) => ({
        portfolio: p,
        id: p._id,
      }));

      setPortfolios(initialPortfolios);
      setHoldings(getPortfolioData.flatMap((p) => p.holdings));
      setSimpleHoldings(getPortfolioData.flatMap((p) => p.simpleHoldings || []));
    }
  }, [getPortfolioData]);

  useEffect(() => {
    localStorage.setItem('portfolio_sort_by', sortBy);
  }, [sortBy]);

  const debouncedUpdateRef = useRef<{ [key: string]: NodeJS.Timeout }>({});

  useEffect(() => {
    const timeouts = debouncedUpdateRef.current;
    return () => {
      Object.values(timeouts).forEach(clearTimeout);
    };
  }, []);

  const uniqueAccounts = useMemo(() => {
    const accounts = new Set<string>();
    holdings.forEach(h => {
      if (h.accountName) {
        accounts.add(h.accountName);
      }
    });
    return Array.from(accounts).sort();
  }, [holdings]);

  useEffect(() => {
    if (!newPortfolioName.trim()) {
      setPortfolioNameError(null);
      return;
    }
    const minLengthError = validateField(newPortfolioName.trim(), [commonRules.minLength(2)]);
    const maxLengthError = validateField(newPortfolioName.trim(), [commonRules.maxLength(50)]);
    setPortfolioNameError(minLengthError || maxLengthError || null);
  }, [newPortfolioName]);

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

  const derivedStats = useMemo(() => ({
    gain: totalHoldingsValue - totalHoldingsCost,
    gainPercent: totalHoldingsCost > 0 ? ((totalHoldingsValue - totalHoldingsCost) / totalHoldingsCost) * 100 : 0,
    liveCount: portfolios.filter(p => p.portfolio.portfolioType !== "manual").length,
    manualCount: portfolios.filter(p => p.portfolio.portfolioType === "manual").length,
  }), [portfolios, totalHoldingsValue, totalHoldingsCost]);

  const getPortfolioAllocationData = useCallback((portfolioId: string, portfolioType?: "live" | "manual") => {
    if (portfolioType === "manual") {
      const portfolioSimpleHoldings = simpleHoldings.filter((h) => h.portfolioId === portfolioId)
      const rawData = portfolioSimpleHoldings.map((holding) => ({
        name: holding.name || "Unknown",
        value: holding.value,
      })).filter(item => item.value > 0)

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

  const sortedAndFilteredPortfolios = useMemo(() => {
    let filtered = portfolios.map((p) => {
      const stats = getPortfolioStats(p.id, p.portfolio.portfolioType);
      return { ...p, stats };
    });

    if (typeFilter !== "all") {
      filtered = filtered.filter((p) => p.portfolio.portfolioType === typeFilter);
    }

    if (accountFilter !== "all") {
      filtered = filtered.filter((p) => {
        const portfolioHoldings = holdings.filter(h => h.portfolioId === p.id);
        return portfolioHoldings.some(h => h.accountName === accountFilter);
      });
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((p) => {
        if (p.portfolio.name.toLowerCase().includes(term)) return true;
        const portfolioHoldings = holdings.filter(h => h.portfolioId === p.id);
        return portfolioHoldings.some(h => 
          h.symbol?.toLowerCase().includes(term) || 
          h.name.toLowerCase().includes(term)
        );
      });
    }

    filtered.sort((a, b) => {
      if (sortBy === "date") {
        const dateA = a.portfolio.lastUpdated ? new Date(a.portfolio.lastUpdated).getTime() : 0;
        const dateB = b.portfolio.lastUpdated ? new Date(b.portfolio.lastUpdated).getTime() : 0;
        if (dateA > 0 && dateB > 0) {
          return dateB - dateA;
        }
        if (dateA > 0 && dateB === 0) return -1;
        if (dateB > 0 && dateA === 0) return 1;
        return 0;
      } else {
        return b.stats.totalValue - a.stats.totalValue;
      }
    });

    return filtered;
  }, [portfolios, typeFilter, accountFilter, searchTerm, sortBy, getPortfolioStats, holdings]);

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

  const updatePortfolioName = (portfolioId: string, name: string) => {
    setPortfolios(
      portfolios.map((p) =>
        p.id === portfolioId ? { ...p, portfolio: { ...p.portfolio, name, lastUpdated: new Date().toISOString() } } : p,
      ),
    );

    if (debouncedUpdateRef.current[portfolioId]) {
      clearTimeout(debouncedUpdateRef.current[portfolioId]);
    }

    setSavingPortfolioId(portfolioId);

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

  const snapshots = (getPortfolioSnapshots && !('error' in getPortfolioSnapshots))
    ? getPortfolioSnapshots.map(s => ({ portfolioId: s.portfolioId ?? undefined, totalValue: s.totalValue, snapshotDate: s.snapshotDate }))
    : [];

  return (
    <div className="flex min-h-screen bg-background">
      <main className="flex-1 overflow-y-auto overflow-x-hidden bg-background pr-4">
        <div className="p-4 lg:p-8 space-y-6">
          {portfolios.length > 0 && (
            <PortfolioHeader
              totalHoldingsValue={totalHoldingsValue}
              totalHoldingsGain={derivedStats.gain}
              totalHoldingsGainPercent={derivedStats.gainPercent}
              totalHoldingsCost={totalHoldingsCost}
              totalLivePortfolios={derivedStats.liveCount}
              totalManualPortfolios={derivedStats.manualCount}
              portfolioCount={portfolios.length}
            />
          )}

          <FiltersBar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            sortBy={sortBy}
            onSortChange={setSortBy}
            typeFilter={typeFilter}
            onTypeFilterChange={setTypeFilter}
            accountFilter={accountFilter}
            onAccountFilterChange={setAccountFilter}
            uniqueAccounts={uniqueAccounts}
            onAddPortfolio={() => setShowNewPortfolioForm(true)}
          />

          <NewPortfolioModal
            isOpen={showNewPortfolioForm}
            onClose={() => {
              setShowNewPortfolioForm(false);
              setNewPortfolioName("");
            }}
            newPortfolioName={newPortfolioName}
            onNewPortfolioNameChange={setNewPortfolioName}
            newPortfolioType={newPortfolioType}
            onNewPortfolioTypeChange={setNewPortfolioType}
            portfolioNameError={portfolioNameError}
            isSaving={isSaving}
            onSubmit={addPortfolio}
          />

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
                const portfolioHoldings = holdings.filter((h) => h.portfolioId === portfolioExpanded.id)
                const portfolioSimpleHoldings = simpleHoldings.filter((h) => h.portfolioId === portfolioExpanded.id)
                const allocationData = getPortfolioAllocationData(portfolioExpanded.id, portfolioExpanded.portfolio.portfolioType)

                return (
                  <PortfolioCard
                    key={portfolioExpanded.id}
                    id={portfolioExpanded.id}
                    name={portfolioExpanded.portfolio.name}
                    portfolioType={portfolioExpanded.portfolio.portfolioType}
                    stats={portfolioExpanded.stats}
                    holdings={portfolioHoldings}
                    simpleHoldings={portfolioSimpleHoldings}
                    allocationData={allocationData}
                    onNameChange={(name) => updatePortfolioName(portfolioExpanded.id, name)}
                    onPerformanceClick={() => setPerformanceModalPortfolioId(portfolioExpanded.id)}
                    savingPortfolioId={savingPortfolioId}
                    renamedPortfolioId={renamedPortfolioId}
                  />
                )
              })
            )}
          </div>

          <PerformanceModal
            isOpen={!!performanceModalPortfolioId}
            onClose={() => setPerformanceModalPortfolioId(null)}
            portfolioName={performanceModalPortfolioId
              ? portfolios.find(p => p.id === performanceModalPortfolioId)?.portfolio.name ?? "Portfolio"
              : "Portfolio"}
            portfolioId={performanceModalPortfolioId}
            snapshots={snapshots}
            currentValue={performanceModalPortfolioId
              ? getPortfolioStats(
                  performanceModalPortfolioId,
                  portfolios.find(p => p.id === performanceModalPortfolioId)?.portfolio.portfolioType
                ).totalValue
              : 0}
          />
        </div>
      </main>
    </div>
  )
}
