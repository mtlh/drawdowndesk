"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Save, Trash2, Plus, TrendingUp, TrendingDown, X, Briefcase } from "lucide-react"
import { Holding, SimpleHolding, isError, isPortfolioArray } from "@/types/portfolios"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { Id } from "../../../../convex/_generated/dataModel"
import { getPriceInPounds } from "@/lib/utils"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

// Helper to get currency symbol
function getCurrencySymbol(currency: string | undefined): string {
  switch (currency) {
    case "USD": return "$";
    case "EUR": return "€";
    case "GBp": return "p";
    case "GBP":
    default: return "£";
  }
}

// Helper to format value with currency
function formatCurrency(value: number, currency: string | undefined): string {
  const symbol = getCurrencySymbol(currency);
  const valueInPounds = getPriceInPounds(value, currency);

  return `${symbol}${valueInPounds.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function PortfolioHoldingsPage() {
  const params = useParams()
  const router = useRouter()
  const portfolioId = params.portfolioId as string

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
  const [editedValues, setEditedValues] = useState<Partial<Holding>>({});
  const [editedSimpleValues, setEditedSimpleValues] = useState<Partial<SimpleHolding>>({});

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

  if (!getPortfolioData) {
    return <LoadingSpinner fullScreen />;
  }

  if (isError(getPortfolioData)) {
    return <div>Error: {getPortfolioData.error}</div>;
  }

  if (!isPortfolioArray(getPortfolioData)) {
    return <div>Error: Unexpected response format.</div>;
  }

  const portfolio = getPortfolioData.find((p) => p._id === portfolioId);
  const portfolioHoldings = holdings.filter((h) => h.portfolioId === portfolioId);
  const portfolioSimpleHoldings = simpleHoldings.filter((h) => h.portfolioId === portfolioId);
  const isManual = portfolio?.portfolioType === "manual";

  if (!portfolio) {
    return (
      <div className="flex min-h-screen bg-background">
        <main className="flex-1 overflow-y-auto">
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

  // Calculate portfolio stats
  const totalValue = isManual
    ? portfolioSimpleHoldings.reduce((sum, h) => sum + h.value, 0)
    : portfolioHoldings.reduce((sum, h) => sum + getPriceInPounds(h.shares * h.currentPrice, h.currency), 0);
  const totalCost = isManual
    ? 0
    : portfolioHoldings.reduce((sum, h) => sum + getPriceInPounds(h.shares * h.avgPrice, h.currency), 0);
  const totalGain = totalValue - totalCost;
  const totalGainPercent = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;

  const showDetailsPanel = selectedHoldingId !== null || isCreatingNew;

  // Select a holding to edit
  const selectHolding = (holdingId: string | null) => {
    if (selectedHoldingId === holdingId) {
      // Deselect
      setSelectedHoldingId(null);
      setIsCreatingNew(false);
      setEditedValues({});
      setEditedSimpleValues({});
    } else {
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
      }
    }
  };

  // Save edited holding
  const saveHolding = async () => {
    if (!editedValues.symbol || !editedValues.name || !editedValues.portfolioId) {
      alert("Please fill in Symbol and Name");
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
      setSelectedHoldingId(null);
      setIsCreatingNew(false);
      setEditedValues({});
    } finally {
      setIsSaving(false);
    }
  };

  // Delete holding
  const deleteHolding = async () => {
    if (!selectedHoldingId || !confirm("Are you sure you want to delete this holding?")) {
      return;
    }

    try {
      await deleteHoldingsMutation({ holdingId: selectedHoldingId as Id<"holdings"> });
      setHoldings(holdings.filter((h) => h._id !== selectedHoldingId));
      setSelectedHoldingId(null);
    } catch (error) {
      console.error("Failed to delete holding:", error);
      alert("Failed to delete holding. Please try again.");
    }
  };

  // Save edited simple holding
  const saveSimpleHolding = async () => {
    if (!editedSimpleValues.name || editedSimpleValues.portfolioId === undefined) {
      alert("Please fill in Name and Value");
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
      setSelectedHoldingId(null);
      setIsCreatingNew(false);
      setEditedSimpleValues({});
    } finally {
      setIsSaving(false);
    }
  };

  // Delete simple holding
  const deleteSimpleHolding = async () => {
    if (!selectedHoldingId || !confirm("Are you sure you want to delete this holding?")) {
      return;
    }

    try {
      await deleteSimpleHoldingMutation({ holdingId: selectedHoldingId as Id<"simpleHoldings"> });
      setSimpleHoldings(simpleHoldings.filter((h) => h._id !== selectedHoldingId));
      setSelectedHoldingId(null);
    } catch (error) {
      console.error("Failed to delete holding:", error);
      alert("Failed to delete holding. Please try again.");
    }
  };

  // Delete entire portfolio
  const deletePortfolio = async () => {
    if (!confirm("Are you sure you want to delete this portfolio and all its holdings?")) {
      return;
    }

    try {
      await deletePortfolioMutation({ id: portfolioId as Id<"portfolios"> });
      window.location.href = "/holdings";
    } catch (error) {
      console.error("Failed to delete portfolio:", error);
      alert("Failed to delete portfolio. Please try again.");
    }
  };

  // Add new holding - create blank entry
  const addHolding = () => {
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
  };

  // Close details panel
  const closePanel = () => {
    setSelectedHoldingId(null);
    setIsCreatingNew(false);
    setEditedValues({});
    setEditedSimpleValues({});
  };

  return (
    <div className="flex min-h-screen bg-background">
      <main className="flex-1 overflow-y-auto bg-background">
        <div className="p-4 lg:p-8 space-y-6">
          {/* Header Section */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Portfolio Display */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-600/20">
                <Briefcase className="w-7 h-7 text-white" />
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">{portfolio.name}</div>
                <div className="text-4xl font-bold tracking-tight">
                  £{totalValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {!isManual && (
                    <>
                      {totalGain >= 0 ? (
                        <TrendingUp className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-600" />
                      )}
                      <span className={`text-sm font-medium ${totalGain >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {totalGain >= 0 ? "+" : ""}£{totalGain.toLocaleString("en-US", { minimumFractionDigits: 2 })} ({totalGainPercent >= 0 ? "+" : ""}{totalGainPercent.toFixed(1)}%)
                      </span>
                    </>
                  )}
                  {isManual && (
                    <span className="text-sm text-muted-foreground">Manual Portfolio</span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 flex-1 lg:max-w-2xl">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border border-blue-200/50 dark:border-blue-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Briefcase className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Holdings</span>
                </div>
                <div className="text-2xl font-bold">{isManual ? portfolioSimpleHoldings.length : portfolioHoldings.length}</div>
              </div>
              {!isManual && (
                <>
                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 border border-emerald-200/50 dark:border-emerald-800/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Total Cost</span>
                    </div>
                    <div className="text-2xl font-bold">£{totalCost.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                  </div>
                  <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20 border border-amber-200/50 dark:border-amber-800/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      {totalGain >= 0 ? (
                        <TrendingUp className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      )}
                      <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Gain/Loss</span>
                    </div>
                    <div className={`text-2xl font-bold ${totalGain >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                      {totalGain >= 0 ? "+" : ""}£{totalGain.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Actions Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <Button variant="ghost" onClick={() => router.push("/holdings")} className="gap-2 -ml-3">
              <ArrowLeft className="h-4 w-4" />
              Back to Holdings
            </Button>
            <div className="flex gap-2">
              <Button variant="destructive" size="sm" onClick={deletePortfolio} className="gap-1.5">
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
              <Button size="sm" onClick={addHolding} className="gap-1.5">
                <Plus className="h-4 w-4" />
                Add Holding
              </Button>
            </div>
          </div>

          {/* Holdings Grid */}
          <Card className="overflow-hidden">
            <div className="px-6 py-4 border-b bg-muted/20 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{isManual ? "Manual Holdings" : "Investment Holdings"}</h3>
                <p className="text-sm text-muted-foreground">
                  {isManual ? portfolioSimpleHoldings.length : portfolioHoldings.length} holdings • £{totalValue.toLocaleString("en-US", { minimumFractionDigits: 2 })} total
                </p>
              </div>
            </div>
            <CardContent className="p-0">
              {isManual ? (
                portfolioSimpleHoldings.length === 0 ? (
                  <div className="py-16 text-center">
                    <div className="flex flex-col items-center max-w-sm mx-auto">
                      <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
                        <Briefcase className="w-7 h-7 text-muted-foreground" />
                      </div>
                      <p className="text-lg font-semibold mb-2">No holdings yet</p>
                      <p className="text-sm text-muted-foreground mb-6 text-center">Click &quot;Add Holding&quot; to get started.</p>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b bg-muted/30">
                        <tr>
                          <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</th>
                          <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Account</th>
                          <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</th>
                          <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Value</th>
                          <th className="px-6 py-3 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {portfolioSimpleHoldings.map((holding) => (
                          <tr 
                            key={holding._id} 
                            className={`hover:bg-muted/30 transition-colors cursor-pointer ${selectedHoldingId === holding._id ? "bg-primary/5" : ""}`}
                            onClick={() => selectHolding(holding._id || null)}
                          >
                            <td className="px-6 py-4">
                              <div className="font-medium">{holding.name || "Unnamed"}</div>
                              {holding.notes && <div className="text-xs text-muted-foreground mt-0.5">{holding.notes}</div>}
                            </td>
                            <td className="px-6 py-4 text-muted-foreground">
                              {holding.accountName || "-"}
                            </td>
                            <td className="px-6 py-4">
                              {holding.dataType && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-secondary text-secondary-foreground">
                                  {holding.dataType}
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right font-semibold">
                              {formatCurrency(holding.value, undefined)}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); selectHolding(holding._id || null); }}>
                                <Save className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              ) : (
                portfolioHoldings.length === 0 ? (
                  <div className="py-16 text-center">
                    <div className="flex flex-col items-center max-w-sm mx-auto">
                      <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
                        <Briefcase className="w-7 h-7 text-muted-foreground" />
                      </div>
                      <p className="text-lg font-semibold mb-2">No holdings yet</p>
                      <p className="text-sm text-muted-foreground mb-6 text-center">Click &quot;Add Holding&quot; to get started.</p>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b bg-muted/30">
                        <tr>
                          <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Symbol</th>
                          <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</th>
                          <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Account</th>
                          <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Shares</th>
                          <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Value</th>
                          <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Gain/Loss</th>
                          <th className="px-6 py-3 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {portfolioHoldings.map((holding) => {
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
                              className={`hover:bg-muted/30 transition-colors cursor-pointer ${selectedHoldingId === holding._id ? "bg-primary/5" : ""}`}
                              onClick={() => selectHolding(holding._id || null)}
                            >
                              <td className="px-6 py-4">
                                <div className="font-medium flex items-center gap-2">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                    {holding.symbol}
                                    {holding.exchange && <span className="text-blue-400">.{holding.exchange}</span>}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm">{holding.name || "No name"}</div>
                              </td>
                              <td className="px-6 py-4 text-muted-foreground text-sm">
                                {holding.accountName || "-"}
                              </td>
                              <td className="px-6 py-4 text-right text-sm">
                                {holding.shares.toLocaleString()}
                              </td>
                              <td className="px-6 py-4 text-right font-semibold">
                                {formatCurrency(marketValue, currency)}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex flex-col items-end">
                                  <span className={`text-sm font-medium ${gainLossPercent >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                                    {gainLossPercent >= 0 ? "+" : ""}{gainLossPercent.toFixed(1)}%
                                  </span>
                                  <span className={`text-xs ${gainLoss >= 0 ? "text-emerald-600/70" : "text-red-600/70"}`}>
                                    {gainLoss >= 0 ? "+" : ""}£{Math.abs(gainLoss).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); selectHolding(holding._id || null); }}>
                                  <Save className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              )}
            </CardContent>
          </Card>

          {/* Details Panel */}
          {showDetailsPanel && (
            <Card className="overflow-hidden border-t-4 border-t-primary">
              <div className="px-6 py-4 border-b bg-muted/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    {isManual ? (
                      <Briefcase className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    ) : (
                      <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold">{isCreatingNew ? "Add New Holding" : "Edit Holding"}</h3>
                    <p className="text-sm text-muted-foreground">
                      {isManual ? "Add a manual holding" : "Update investment details"}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={closePanel} aria-label="Close panel">
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <CardContent className="p-6">
                {isManual ? (
                  <SimpleHoldingForm
                    editedValues={editedSimpleValues}
                    setEditedValues={setEditedSimpleValues}
                    onSave={saveSimpleHolding}
                    onDelete={isCreatingNew ? undefined : deleteSimpleHolding}
                    isCreating={isCreatingNew}
                    isSaving={isSaving}
                  />
                ) : (
                  <LiveHoldingForm
                    editedValues={editedValues}
                    setEditedValues={setEditedValues}
                    onSave={saveHolding}
                    onDelete={isCreatingNew ? undefined : deleteHolding}
                    isCreating={isCreatingNew}
                    isSaving={isSaving}
                  />
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}

// Simple Holding Form Component
function SimpleHoldingForm({
  editedValues,
  setEditedValues,
  onSave,
  onDelete,
  isCreating,
  isSaving,
}: {
  editedValues: Partial<SimpleHolding>;
  setEditedValues: (values: Partial<SimpleHolding>) => void;
  onSave: () => void;
  onDelete?: () => void;
  isCreating: boolean;
  isSaving: boolean;
}) {
  const simpleEdited = editedValues as Partial<SimpleHolding>;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div>
          <label htmlFor="simple-name" className="text-sm font-medium">Name</label>
          <Input
            id="simple-name"
            value={simpleEdited.name || ""}
            onChange={(e) => setEditedValues({ ...simpleEdited, name: e.target.value })}
            placeholder="e.g., Vanguard Global All Cap"
            className="mt-1.5"
          />
        </div>
        <div>
          <label htmlFor="simple-value" className="text-sm font-medium">Value (£)</label>
          <Input
            id="simple-value"
            type="number"
            step="any"
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
            <SelectTrigger id="simple-type" className="mt-1.5">
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
        <Button onClick={onSave} disabled={isSaving} className="gap-2">
          <Save className="h-4 w-4" />
          {isSaving ? "Saving..." : isCreating ? "Create Holding" : "Save Changes"}
        </Button>
        {onDelete && (
          <Button variant="destructive" onClick={onDelete} className="gap-2">
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}

// Live Holding Form Component
function LiveHoldingForm({
  editedValues,
  setEditedValues,
  onSave,
  onDelete,
  isCreating,
  isSaving,
}: {
  editedValues: Partial<Holding>;
  setEditedValues: (values: Partial<Holding>) => void;
  onSave: () => void;
  onDelete?: () => void;
  isCreating: boolean;
  isSaving: boolean;
}) {
  const liveEdited = editedValues as Partial<Holding>;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        <div>
          <a
            href="https://api.twelvedata.com/etfs?apikey=demo&country=UK"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Find UK ETFs
          </a>
          <label htmlFor="live-symbol" className="text-sm font-medium">Symbol</label>
          <Input
            id="live-symbol"
            value={liveEdited.symbol || ""}
            onChange={(e) => setEditedValues({ ...liveEdited, symbol: e.target.value })}
            placeholder="e.g., ACWI"
            className="mt-1.5"
          />
        </div>
        <div>
          <label htmlFor="live-exchange" className="text-sm font-medium">Exchange</label>
          <Input
            id="live-exchange"
            value={liveEdited.exchange || ""}
            onChange={(e) => setEditedValues({ ...liveEdited, exchange: e.target.value })}
            placeholder="e.g., LSE"
            className="mt-1.5"
          />
        </div>
        <div>
          <label htmlFor="live-name" className="text-sm font-medium">Name</label>
          <Input
            id="live-name"
            value={liveEdited.name || ""}
            onChange={(e) => setEditedValues({ ...liveEdited, name: e.target.value })}
            placeholder="e.g., iShares MSCI ACWI"
            className="mt-1.5"
          />
        </div>
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
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        <div>
          <label htmlFor="live-type" className="text-sm font-medium">Type</label>
          <Select
            value={liveEdited.dataType || "stock"}
            onValueChange={(value) => setEditedValues({ ...liveEdited, dataType: value })}
          >
            <SelectTrigger id="live-type" className="mt-1.5" aria-label="Select data type">
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
        <div>
          <label htmlFor="live-shares" className="text-sm font-medium">Shares</label>
          <Input
            id="live-shares"
            type="number"
            step="any"
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
          <label htmlFor="live-avg-price" className="text-sm font-medium">
            Avg Price {liveEdited.currency === "GBp" ? "(pence)" : liveEdited.currency === "USD" ? "($)" : liveEdited.currency === "EUR" ? "(€)" : "(£)"}
          </label>
          <Input
            id="live-avg-price"
            type="number"
            step="any"
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
            value={liveEdited.currentPrice ?? ""}
            readOnly
            placeholder="Auto-filled from API"
            className="mt-1.5 bg-muted"
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
      <div className="flex gap-3 pt-2">
        <Button onClick={onSave} disabled={isSaving} className="gap-2">
          <Save className="h-4 w-4" />
          {isSaving ? "Saving..." : isCreating ? "Create Holding" : "Save Changes"}
        </Button>
        {onDelete && (
          <Button variant="destructive" onClick={onDelete} className="gap-2">
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}
