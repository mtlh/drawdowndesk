"use client"

import { useEffect, useState, useRef, useMemo, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { ArrowLeft, Save, Trash2, Plus, TrendingUp, TrendingDown, Briefcase, PieChart as PieChartIcon, Wallet, BarChart3, Search, X } from "lucide-react"
import { Holding, SimpleHolding, isError, isPortfolioArray } from "@/types/portfolios"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { Id } from "../../../../convex/_generated/dataModel"
import { getPriceInPounds } from "@/lib/utils"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

export default function PortfolioHoldingsPage() {
  const params = useParams()
  const router = useRouter()
  const portfolioId = params.portfolioId as string
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  const getPortfolioData = useQuery(api.portfolio.getUserPortfolio.getUserPortfolio, {});
  const updateHoldingMutation = useMutation(api.portfolio.updateUserHoldings.updateUserHolding);
  const deleteHoldingsMutation = useMutation(api.portfolio.deleteUserHoldings.deleteUserHoldings);
  const updateSimpleHoldingMutation = useMutation(api.portfolio.updateSimpleHoldings.updateSimpleHolding);
  const deleteSimpleHoldingMutation = useMutation(api.portfolio.updateSimpleHoldings.deleteSimpleHolding);
  const deletePortfolioMutation = useMutation(api.portfolio.deleteUserPortfolio.deleteUserPortfolio);

  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [simpleHoldings, setSimpleHoldings] = useState<SimpleHolding[]>([]);
  const [selectedHoldingId, setSelectedHoldingId] = useState<string | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editedValues, setEditedValues] = useState<Partial<Holding>>({});
  const [editedSimpleValues, setEditedSimpleValues] = useState<Partial<SimpleHolding>>({});
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'holding' | 'simpleHolding' | 'portfolio'; id: string } | null>(null);
  const [searchWithinPortfolio, setSearchWithinPortfolio] = useState("");

  const initialized = useRef(false);
  useEffect(() => {
    if (
      getPortfolioData &&
      isPortfolioArray(getPortfolioData) &&
      !initialized.current
    ) {
      initialized.current = true;
      setHoldings(getPortfolioData.flatMap((p) => p.holdings));
      setSimpleHoldings(getPortfolioData.flatMap((p) => p.simpleHoldings || []));
    }
  }, [getPortfolioData]);

  const portfolioHoldings = useMemo(() => 
    holdings.filter((h) => h.portfolioId === portfolioId), 
    [holdings, portfolioId]
  );
  
  const portfolioSimpleHoldings = useMemo(() => 
    simpleHoldings.filter((h) => h.portfolioId === portfolioId), 
    [simpleHoldings, portfolioId]
  );

  const filteredPortfolioHoldings = useMemo(() => {
    if (!searchWithinPortfolio.trim()) return portfolioHoldings;
    const term = searchWithinPortfolio.toLowerCase();
    return portfolioHoldings.filter(h => 
      h.symbol?.toLowerCase().includes(term) || 
      h.name.toLowerCase().includes(term) ||
      h.accountName?.toLowerCase().includes(term)
    );
  }, [portfolioHoldings, searchWithinPortfolio]);

  const filteredPortfolioSimpleHoldings = useMemo(() => {
    if (!searchWithinPortfolio.trim()) return portfolioSimpleHoldings;
    const term = searchWithinPortfolio.toLowerCase();
    return portfolioSimpleHoldings.filter(h => 
      h.name.toLowerCase().includes(term) ||
      h.accountName?.toLowerCase().includes(term)
    );
  }, [portfolioSimpleHoldings, searchWithinPortfolio]);

  const isManual = useMemo(() => {
    if (!getPortfolioData || isError(getPortfolioData) || !isPortfolioArray(getPortfolioData)) return false;
    const portfolio = getPortfolioData.find((p) => p._id === portfolioId);
    return portfolio?.portfolioType === "manual";
  }, [getPortfolioData, portfolioId]);

  const portfolio = useMemo(() => {
    if (!getPortfolioData || isError(getPortfolioData) || !isPortfolioArray(getPortfolioData)) return undefined;
    return getPortfolioData.find((p) => p._id === portfolioId);
  }, [getPortfolioData, portfolioId]);

  const totalValue = useMemo(() => 
    isManual
      ? portfolioSimpleHoldings.reduce((sum, h) => sum + h.value, 0)
      : portfolioHoldings.reduce((sum, h) => sum + getPriceInPounds(h.shares * h.currentPrice, h.currency), 0),
    [isManual, portfolioHoldings, portfolioSimpleHoldings]
  );
  
  const totalCost = useMemo(() => 
    isManual
      ? 0
      : portfolioHoldings.reduce((sum, h) => sum + getPriceInPounds(h.shares * h.avgPrice, h.currency), 0),
    [isManual, portfolioHoldings]
  );
  
  const totalGain = totalValue - totalCost;
  const totalGainPercent = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;

  useEffect(() => {
    if (isSheetOpen && closeButtonRef.current) {
      closeButtonRef.current.focus()
    }
  }, [isSheetOpen])

  const openEditSheet = useCallback((holdingId: string | null) => {
    const holding = portfolioHoldings.find(h => h._id === holdingId) || portfolioSimpleHoldings.find(h => h._id === holdingId);
    if (holding) {
      setSelectedHoldingId(holdingId);
      setIsCreatingNew(false);
      if ('symbol' in holding) {
        setEditedValues(holding);
        setEditedSimpleValues({});
      } else {
        setEditedSimpleValues(holding);
        setEditedValues({});
      }
      setIsSheetOpen(true);
    }
  }, [portfolioHoldings, portfolioSimpleHoldings]);

  const openCreateSheet = useCallback(() => {
    if (isManual) {
      setEditedSimpleValues({
        portfolioId: portfolioId as Id<"portfolios">,
        name: "",
        value: 0,
        accountName: "",
        dataType: "",
        notes: "",
      });
      setEditedValues({});
    } else {
      setEditedValues({
        portfolioId: portfolioId as Id<"portfolios">,
        symbol: "",
        name: "",
        accountName: "",
        dataType: "stock",
        exchange: "",
        currency: "GBP",
        shares: 0,
        avgPrice: 0,
        currentPrice: 0,
        purchaseDate: new Date().toISOString().split("T")[0],
      });
      setEditedSimpleValues({});
    }
    setSelectedHoldingId("new");
    setIsCreatingNew(true);
    setIsSheetOpen(true);
  }, [isManual, portfolioId]);

  const closeSheet = useCallback(() => {
    setIsSheetOpen(false);
    setSelectedHoldingId(null);
    setIsCreatingNew(false);
    setEditedValues({});
    setEditedSimpleValues({});
  }, []);

  if (!getPortfolioData) {
    return <LoadingSpinner fullScreen />;
  }

  if (isError(getPortfolioData)) {
    return (
      <div className="flex min-h-screen bg-background" role="alert">
        <main className="flex-1 p-4 lg:p-8">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <p className="text-destructive">Error: {getPortfolioData.error}</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!isPortfolioArray(getPortfolioData)) {
    return (
      <div className="flex min-h-screen bg-background" role="alert">
        <main className="flex-1 p-4 lg:p-8">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <p className="text-destructive">Error: Unexpected response format.</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!portfolio) {
    return (
      <div className="flex min-h-screen bg-background">
        <main className="flex-1 overflow-y-auto overflow-x-hidden pr-4">
          <div className="p-4 lg:p-8">
            <div className="mb-4">
              <Button variant="ghost" onClick={() => router.push("/holdings")} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Holdings
              </Button>
            </div>
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <p className="text-muted-foreground">Portfolio not found.</p>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  const saveHolding = async () => {
    if (!editedValues.symbol || !editedValues.name || !editedValues.portfolioId) {
      return;
    }

    setIsSaving(true);
    try {
      if (isCreatingNew) {
        await updateHoldingMutation({
          portfolioId: editedValues.portfolioId as Id<"portfolios">,
          symbol: editedValues.symbol,
          name: editedValues.name,
          accountName: editedValues.accountName,
          dataType: editedValues.dataType || "stock",
          exchange: editedValues.exchange,
          currency: editedValues.currency || "GBP",
          shares: editedValues.shares || 0,
          avgPrice: editedValues.avgPrice || 0,
          currentPrice: editedValues.currentPrice || 0,
          purchaseDate: editedValues.purchaseDate || new Date().toISOString().split("T")[0],
        });
        const newData = await getPortfolioData;
        if (newData && isPortfolioArray(newData)) {
          setHoldings(newData.flatMap((p) => p.holdings));
        }
      } else {
        await updateHoldingMutation({
          _id: selectedHoldingId as Id<"holdings">,
          portfolioId: editedValues.portfolioId as Id<"portfolios">,
          symbol: editedValues.symbol,
          name: editedValues.name,
          accountName: editedValues.accountName,
          dataType: editedValues.dataType || "stock",
          exchange: editedValues.exchange,
          currency: editedValues.currency || "GBP",
          shares: editedValues.shares || 0,
          avgPrice: editedValues.avgPrice || 0,
          currentPrice: editedValues.currentPrice || 0,
          purchaseDate: editedValues.purchaseDate || new Date().toISOString().split("T")[0],
        });
        setHoldings(holdings.map((h) =>
          h._id === selectedHoldingId
            ? { ...editedValues, _id: h._id } as Holding
            : h
        ));
      }
      closeSheet();
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = (type: 'holding' | 'simpleHolding' | 'portfolio', id: string) => {
    setDeleteTarget({ type, id });
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    try {
      if (deleteTarget.type === 'holding') {
        await deleteHoldingsMutation({ holdingId: deleteTarget.id as Id<"holdings"> });
        setHoldings(holdings.filter((h) => h._id !== deleteTarget.id));
      } else if (deleteTarget.type === 'simpleHolding') {
        await deleteSimpleHoldingMutation({ holdingId: deleteTarget.id as Id<"simpleHoldings"> });
        setSimpleHoldings(simpleHoldings.filter((h) => h._id !== deleteTarget.id));
      } else if (deleteTarget.type === 'portfolio') {
        await deletePortfolioMutation({ id: portfolioId as Id<"portfolios"> });
        router.push("/holdings");
      }
      closeSheet();
    } catch (error) {
      console.error("Failed to delete:", error);
    } finally {
      setDeleteConfirmOpen(false);
      setDeleteTarget(null);
    }
  };

  const saveSimpleHolding = async () => {
    if (!editedSimpleValues.name || editedSimpleValues.portfolioId === undefined) {
      return;
    }

    setIsSaving(true);
    try {
      if (isCreatingNew) {
        await updateSimpleHoldingMutation({
          portfolioId: editedSimpleValues.portfolioId as Id<"portfolios">,
          name: editedSimpleValues.name,
          value: editedSimpleValues.value || 0,
          accountName: editedSimpleValues.accountName,
          dataType: editedSimpleValues.dataType || "stock",
          notes: editedSimpleValues.notes,
        });
        const newData = await getPortfolioData;
        if (newData && isPortfolioArray(newData)) {
          setSimpleHoldings(newData.flatMap((p) => p.simpleHoldings || []));
        }
      } else {
        await updateSimpleHoldingMutation({
          _id: selectedHoldingId as Id<"simpleHoldings">,
          portfolioId: editedSimpleValues.portfolioId as Id<"portfolios">,
          name: editedSimpleValues.name,
          value: editedSimpleValues.value || 0,
          accountName: editedSimpleValues.accountName,
          dataType: editedSimpleValues.dataType || "stock",
          notes: editedSimpleValues.notes,
        });
        setSimpleHoldings(simpleHoldings.map((h) =>
          h._id === selectedHoldingId
            ? { ...editedSimpleValues, _id: h._id } as SimpleHolding
            : h
        ));
      }
      closeSheet();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <main className="flex-1 overflow-y-auto overflow-x-hidden bg-background pr-4" role="main" aria-label="Portfolio holdings">
        <div className="p-4 lg:p-8 space-y-6">
          <header>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => router.push("/holdings")} 
                  className="shrink-0"
                  aria-label="Back to holdings"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-600/20" aria-hidden="true">
                  <Briefcase className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">{portfolio.name}</h1>
                  <p className="text-sm text-muted-foreground">
                    {isManual ? "Manual Portfolio" : "Live Portfolio"} • {isManual ? portfolioSimpleHoldings.length : portfolioHoldings.length} holdings
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={() => confirmDelete('portfolio', portfolioId)} 
                  className="gap-1.5"
                  aria-label="Delete portfolio"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
                <Button 
                  size="sm" 
                  onClick={openCreateSheet} 
                  className="gap-1.5"
                  aria-label="Add new holding"
                >
                  <Plus className="h-4 w-4" />
                  Add Holding
                </Button>
              </div>
            </div>
          </header>

          <section aria-label="Portfolio statistics">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200/50 dark:border-blue-800/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Wallet className="w-4 h-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                    <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Value</span>
                  </div>
                  <div className="text-2xl font-bold" aria-live="polite">
                    £{totalValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </div>
                </CardContent>
              </Card>

              {!isManual && (
                <>
                  <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 border-emerald-200/50 dark:border-emerald-800/50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <BarChart3 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                        <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Total Cost</span>
                      </div>
                      <div className="text-2xl font-bold">
                        £{totalCost.toLocaleString("en-US", { minimumFractionDigits: 0 })}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className={`bg-gradient-to-br ${totalGain >= 0 ? "from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 border-emerald-200/50 dark:border-emerald-800/50" : "from-red-50 to-red-100/50 dark:from-red-950/30 dark:to-red-900/20 border-red-200/50 dark:border-red-800/50"}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        {totalGain >= 0 ? (
                          <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" aria-hidden="true" />
                        )}
                        <span className={`text-sm font-medium ${totalGain >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                          Gain/Loss
                        </span>
                      </div>
                      <div className={`text-2xl font-bold ${totalGain >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`} aria-live="polite">
                        {totalGain >= 0 ? "+" : ""}£{totalGain.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </div>
                      <div className={`text-sm ${totalGain >= 0 ? "text-emerald-600/70" : "text-red-600/70"}`} aria-live="polite">
                        {totalGainPercent >= 0 ? "+" : ""}{totalGainPercent.toFixed(1)}%
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <PieChartIcon className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                    <span className="text-sm font-medium text-muted-foreground">Holdings</span>
                  </div>
                  <div className="text-2xl font-bold" aria-live="polite">
                    {isManual ? portfolioSimpleHoldings.length : portfolioHoldings.length}
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Briefcase className="w-4 h-4" aria-hidden="true" />
                  {isManual ? "Holdings" : "Investments"}
                </CardTitle>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search..."
                    value={searchWithinPortfolio}
                    onChange={(e) => setSearchWithinPortfolio(e.target.value)}
                    className="w-[150px] h-8 pl-8 pr-8 text-sm"
                    aria-label="Search holdings"
                  />
                  {searchWithinPortfolio && (
                    <button
                      onClick={() => setSearchWithinPortfolio("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label="Clear search"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isManual ? (
                filteredPortfolioSimpleHoldings.length === 0 ? (
                  <div className="py-12 text-center" role="status">
                    <Briefcase className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" aria-hidden="true" />
                    <p className="text-muted-foreground">{searchWithinPortfolio ? "No holdings match your search" : "No holdings yet"}</p>
                    {!searchWithinPortfolio && (
                      <Button size="sm" onClick={openCreateSheet} className="mt-3 gap-1.5">
                        <Plus className="h-4 w-4" aria-hidden="true" />
                        Add Holding
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b text-xs text-muted-foreground">
                          <th className="text-left px-4 py-3 font-medium">Name</th>
                          <th className="text-left px-4 py-3 font-medium">Account</th>
                          <th className="text-right px-4 py-3 font-medium">Type</th>
                          <th className="text-right px-4 py-3 font-medium">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPortfolioSimpleHoldings.map((holding) => (
                          <tr
                            key={holding._id}
                            className="border-b hover:bg-muted/30 transition-colors cursor-pointer"
                            onClick={() => openEditSheet(holding._id || null)}
                          >
                            <td className="px-4 py-3 font-medium">{holding.name || "Unnamed"}</td>
                            <td className="px-4 py-3 text-muted-foreground">{holding.accountName || "—"}</td>
                            <td className="px-4 py-3 text-muted-foreground capitalize">{holding.dataType || "—"}</td>
                            <td className="px-4 py-3 text-right font-semibold">£{holding.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              ) : filteredPortfolioHoldings.length === 0 ? (
                <div className="py-12 text-center" role="status">
                  <Briefcase className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" aria-hidden="true" />
                  <p className="text-muted-foreground">{searchWithinPortfolio ? "No holdings match your search" : "No holdings yet"}</p>
                  {!searchWithinPortfolio && (
                    <Button size="sm" onClick={openCreateSheet} className="mt-3 gap-1.5">
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      Add Holding
                    </Button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-xs text-muted-foreground">
                        <th className="text-left px-4 py-3 font-medium">Symbol</th>
                        <th className="text-left px-4 py-3 font-medium">Name</th>
                        <th className="text-right px-4 py-3 font-medium">Shares</th>
                        <th className="text-right px-4 py-3 font-medium">Price</th>
                        <th className="text-right px-4 py-3 font-medium">Cost</th>
                        <th className="text-right px-4 py-3 font-medium">Value</th>
                        <th className="text-right px-4 py-3 font-medium">Gain/Loss</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPortfolioHoldings.map((holding) => {
                        const currency = holding.currency || "GBP";
                        const marketValue = holding.shares * holding.currentPrice;
                        const marketValueInPounds = getPriceInPounds(marketValue, currency);
                        const cost = holding.shares * holding.avgPrice;
                        const costInPounds = getPriceInPounds(cost, currency);
                        const gainLoss = marketValueInPounds - costInPounds;
                        const gainLossPercent = costInPounds > 0 ? (gainLoss / costInPounds) * 100 : 0;
                        return (
                          <tr
                            key={holding._id}
                            className="border-b hover:bg-muted/30 transition-colors cursor-pointer"
                            onClick={() => openEditSheet(holding._id || null)}
                          >
                            <td className="px-4 py-3">
                              <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                {holding.symbol}
                              </span>
                              {holding.exchange && <span className="text-xs text-muted-foreground ml-1">.{holding.exchange}</span>}
                            </td>
                            <td className="px-4 py-3 max-w-[200px] truncate">{holding.name}</td>
                            <td className="px-4 py-3 text-right text-muted-foreground">{holding.shares.toLocaleString()}</td>
                            <td className="px-4 py-3 text-right text-muted-foreground">£{holding.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td className="px-4 py-3 text-right text-muted-foreground">£{costInPounds.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td className="px-4 py-3 text-right font-semibold">£{marketValueInPounds.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td className={`px-4 py-3 text-right font-medium ${gainLossPercent >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                              {gainLossPercent >= 0 ? "+" : ""}{gainLossPercent.toFixed(1)}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Sheet open={isSheetOpen} onOpenChange={(open) => !open && closeSheet()}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto p-6 me-4 sm:me-8">
          <SheetHeader className="mb-6">
            <SheetTitle className="flex items-center gap-2">
              {isCreatingNew ? (
                <>
                  <Plus className="w-5 h-5" aria-hidden="true" />
                  Add New Holding
                </>
              ) : (
                <>
                  <Briefcase className="w-5 h-5" aria-hidden="true" />
                  Edit Holding
                </>
              )}
            </SheetTitle>
          </SheetHeader>

          {isManual ? (
            <SimpleHoldingForm
              editedValues={editedSimpleValues}
              setEditedValues={setEditedSimpleValues}
              onSave={saveSimpleHolding}
              onDelete={() => selectedHoldingId && confirmDelete('simpleHolding', selectedHoldingId)}
              isCreating={isCreatingNew}
              isSaving={isSaving}
              onCancel={closeSheet}
              ref={closeButtonRef}
            />
          ) : (
            <LiveHoldingForm
              editedValues={editedValues}
              setEditedValues={setEditedValues}
              onSave={saveHolding}
              onDelete={() => selectedHoldingId && confirmDelete('holding', selectedHoldingId)}
              isCreating={isCreatingNew}
              isSaving={isSaving}
              onCancel={closeSheet}
              ref={closeButtonRef}
            />
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this {deleteTarget?.type === 'portfolio' ? 'portfolio and all its holdings' : 'holding'}?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

import { forwardRef } from "react"

const SimpleHoldingForm = forwardRef<HTMLButtonElement, {
  editedValues: Partial<SimpleHolding>;
  setEditedValues: (values: Partial<SimpleHolding>) => void;
  onSave: () => void;
  onDelete?: () => void;
  isCreating: boolean;
  isSaving: boolean;
  onCancel: () => void;
}>(({ editedValues, setEditedValues, onSave, onDelete, isCreating, isSaving, onCancel }, ref) => {
  const simpleEdited = editedValues as Partial<SimpleHolding>;
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    if (!simpleEdited.name) {
      setError("Name is required");
      return;
    }
    if (simpleEdited.value === undefined || simpleEdited.value <= 0) {
      setError("Value must be greater than 0");
      return;
    }
    setError(null);
    onSave();
  };

  return (
    <div className="space-y-5">
      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm" role="alert">
          {error}
        </div>
      )}
      <div className="space-y-3">
        <div>
          <label htmlFor="simple-name" className="text-sm font-medium">Name *</label>
          <Input
            id="simple-name"
            value={simpleEdited.name || ""}
            onChange={(e) => setEditedValues({ ...simpleEdited, name: e.target.value })}
            placeholder="e.g., Vanguard Global All Cap"
            className="mt-1.5"
            required
            aria-required="true"
          />
        </div>
        <div>
          <label htmlFor="simple-value" className="text-sm font-medium">Value (£) *</label>
          <Input
            id="simple-value"
            type="number"
            step="any"
            min="0"
            value={simpleEdited.value ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "" || val === "-") {
                setEditedValues({ ...simpleEdited, value: undefined });
              } else {
                const parsed = parseFloat(val);
                if (!isNaN(parsed)) {
                  setEditedValues({ ...simpleEdited, value: parsed });
                }
              }
            }}
            placeholder="Enter value"
            className="mt-1.5"
            required
            aria-required="true"
          />
        </div>
        <div>
          <label htmlFor="simple-account" className="text-sm font-medium">Account</label>
          <Input
            id="simple-account"
            value={simpleEdited.accountName || ""}
            onChange={(e) => setEditedValues({ ...simpleEdited, accountName: e.target.value })}
            placeholder="e.g., S&S ISA"
            className="mt-1.5"
          />
        </div>
        <div>
          <label htmlFor="simple-type" className="text-sm font-medium">Type</label>
          <Select
            value={simpleEdited.dataType || "stock"}
            onValueChange={(value) => setEditedValues({ ...simpleEdited, dataType: value })}
          >
            <SelectTrigger id="simple-type" className="mt-1.5" aria-label="Select asset type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="stock">Stock</SelectItem>
              <SelectItem value="bond">Bond</SelectItem>
              <SelectItem value="commodity">Commodity</SelectItem>
              <SelectItem value="crypto">Crypto</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <label htmlFor="simple-notes" className="text-sm font-medium">Notes <span className="text-muted-foreground font-normal">(optional)</span></label>
        <Input
          id="simple-notes"
          value={simpleEdited.notes || ""}
          onChange={(e) => setEditedValues({ ...simpleEdited, notes: e.target.value })}
          placeholder="Optional notes"
          className="mt-1.5"
        />
      </div>
      <div className="flex gap-3 pt-2">
        <Button onClick={handleSave} disabled={isSaving} className="gap-2">
          <Save className="h-4 w-4" aria-hidden="true" />
          {isSaving ? "Saving..." : isCreating ? "Create" : "Save Changes"}
        </Button>
        {onDelete && (
          <Button variant="destructive" onClick={onDelete} className="gap-2" aria-label="Delete this holding">
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Delete
          </Button>
        )}
        <Button ref={ref} variant="outline" onClick={onCancel} className="ml-auto">
          Cancel
        </Button>
      </div>
    </div>
  );
});

SimpleHoldingForm.displayName = "SimpleHoldingForm";

const LiveHoldingForm = forwardRef<HTMLButtonElement, {
  editedValues: Partial<Holding>;
  setEditedValues: (values: Partial<Holding>) => void;
  onSave: () => void;
  onDelete?: () => void;
  isCreating: boolean;
  isSaving: boolean;
  onCancel: () => void;
}>(({ editedValues, setEditedValues, onSave, onDelete, isCreating, isSaving, onCancel }, ref) => {
  const liveEdited = editedValues as Partial<Holding>;
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    if (!liveEdited.symbol) {
      setError("Symbol is required");
      return;
    }
    if (!liveEdited.name) {
      setError("Name is required");
      return;
    }
    setError(null);
    onSave();
  };

  return (
    <div className="space-y-5">
      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm" role="alert">
          {error}
        </div>
      )}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <a
              href="https://api.twelvedata.com/etfs?apikey=demo&country=UK"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Find UK ETFs
            </a>
            <label htmlFor="live-symbol" className="text-sm font-medium">Symbol *</label>
            <Input
              id="live-symbol"
              value={liveEdited.symbol || ""}
              onChange={(e) => setEditedValues({ ...liveEdited, symbol: e.target.value.toUpperCase() })}
              placeholder="e.g., ACWI"
              className="mt-1.5"
              required
              aria-required="true"
            />
          </div>
          <div>
            <label htmlFor="live-exchange" className="text-sm font-medium">Exchange</label>
            <Input
              id="live-exchange"
              value={liveEdited.exchange || ""}
              onChange={(e) => setEditedValues({ ...liveEdited, exchange: e.target.value.toUpperCase() })}
              placeholder="e.g., LSE"
              className="mt-1.5"
            />
          </div>
        </div>
        <div>
          <label htmlFor="live-name" className="text-sm font-medium">Name *</label>
          <Input
            id="live-name"
            value={liveEdited.name || ""}
            onChange={(e) => setEditedValues({ ...liveEdited, name: e.target.value })}
            placeholder="e.g., iShares MSCI ACWI"
            className="mt-1.5"
            required
            aria-required="true"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="live-account" className="text-sm font-medium">Account</label>
            <Input
              id="live-account"
              value={liveEdited.accountName || ""}
              onChange={(e) => setEditedValues({ ...liveEdited, accountName: e.target.value })}
              placeholder="e.g., S&S ISA"
              className="mt-1.5"
            />
          </div>
          <div>
            <label htmlFor="live-currency" className="text-sm font-medium">Currency</label>
            <Input
              id="live-currency"
              value={liveEdited.currency || "GBP"}
              readOnly
              className="mt-1.5 bg-muted"
              aria-label="Currency (read-only)"
            />
          </div>
        </div>
        <div>
          <label htmlFor="live-type" className="text-sm font-medium">Type</label>
          <Select
            value={liveEdited.dataType || "stock"}
            onValueChange={(value) => setEditedValues({ ...liveEdited, dataType: value })}
          >
            <SelectTrigger id="live-type" className="mt-1.5" aria-label="Select asset type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="stock">Stock</SelectItem>
              <SelectItem value="bond">Bond</SelectItem>
              <SelectItem value="commodity">Commodity</SelectItem>
              <SelectItem value="crypto">Crypto</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-3 pt-2">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="live-shares" className="text-sm font-medium">Shares</label>
            <Input
              id="live-shares"
              type="number"
              step="any"
              min="0"
              value={liveEdited.shares ?? ""}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "" || val === "-") {
                  setEditedValues({ ...liveEdited, shares: undefined });
                } else {
                  const parsed = parseFloat(val);
                  if (!isNaN(parsed)) {
                    setEditedValues({ ...liveEdited, shares: parsed });
                  }
                }
              }}
              placeholder="e.g., 100.5"
              className="mt-1.5"
            />
          </div>
          <div>
            <label htmlFor="live-purchase-date" className="text-sm font-medium">Purchase Date</label>
            <Input
              id="live-purchase-date"
              type="date"
              value={liveEdited.purchaseDate || ""}
              onChange={(e) => setEditedValues({ ...liveEdited, purchaseDate: e.target.value })}
              className="mt-1.5"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="live-avg-price" className="text-sm font-medium">
              Avg Price {liveEdited.currency === "GBp" ? "(pence)" : liveEdited.currency === "USD" ? "($)" : liveEdited.currency === "EUR" ? "(€)" : "(£)"}
            </label>
            <Input
              id="live-avg-price"
              type="number"
              step="any"
              min="0"
              value={liveEdited.avgPrice ?? ""}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "" || val === "-") {
                  setEditedValues({ ...liveEdited, avgPrice: undefined });
                } else {
                  const parsed = parseFloat(val);
                  if (!isNaN(parsed)) {
                    setEditedValues({ ...liveEdited, avgPrice: parsed });
                  }
                }
              }}
              placeholder="Enter price"
              className="mt-1.5"
            />
          </div>
          <div>
            <label htmlFor="live-current-price" className="text-sm font-medium">
              Current Price {liveEdited.currency === "GBp" ? "(pence)" : liveEdited.currency === "USD" ? "($)" : liveEdited.currency === "EUR" ? "(€)" : "(£)"}
            </label>
            <Input
              id="live-current-price"
              type="number"
              step="any"
              min="0"
              value={liveEdited.currentPrice ?? ""}
              readOnly
              placeholder="Auto-filled"
              className="mt-1.5 bg-muted"
              aria-label="Current price (read-only, auto-filled from API)"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button onClick={handleSave} disabled={isSaving} className="gap-2">
          <Save className="h-4 w-4" aria-hidden="true" />
          {isSaving ? "Saving..." : isCreating ? "Create" : "Save Changes"}
        </Button>
        {onDelete && (
          <Button variant="destructive" onClick={onDelete} className="gap-2" aria-label="Delete this holding">
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Delete
          </Button>
        )}
        <Button ref={ref} variant="outline" onClick={onCancel} className="ml-auto">
          Cancel
        </Button>
      </div>
    </div>
  );
});

LiveHoldingForm.displayName = "LiveHoldingForm";
