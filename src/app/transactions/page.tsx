"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, ArrowUpDown, ArrowUp, ArrowDown, Trash2, Info, CirclePlus, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Portfolio, Holding, isPortfolioArray } from "@/types/portfolios";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { getPriceInPounds } from "@/lib/utils";

type SortField = "purchaseDate" | "symbol" | "buyShares" | "pricePerShare" | "totalValue";
type SortDirection = "asc" | "desc";
type DateFilter = "all" | "this_year" | "last_year";

interface TransactionFormData {
  id: string;
  portfolioId: string;
  portfolioName: string;
  holdingId: string;
  isNewHolding: boolean;
  symbol: string;
  name: string;
  accountName?: string;
  currency: string;
  shares: string;
  price: string;
  date: string;
  notes: string;
  isBuy: boolean;
}

export default function TransactionsPage() {
  const getPortfolioData = useQuery(api.portfolio.getUserPortfolio.getUserPortfolio, {});
  const buySellEvents = useQuery(api.portfolio.buySellEvents.getBuySellEvents, {});
  const addBuySellEvent = useMutation(api.portfolio.buySellEvents.addBuySellEvent);
  const deleteBuySellEvent = useMutation(api.portfolio.buySellEvents.deleteBuySellEvent);

  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [sortField, setSortField] = useState<SortField>("purchaseDate");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Multi-add state - queue of transactions
  const [transactionQueue, setTransactionQueue] = useState<TransactionFormData[]>([]);

  // Form state
  const [formPortfolioId, setFormPortfolioId] = useState<string>("");
  const [formPortfolioName, setFormPortfolioName] = useState<string>("");
  const [formExistingHoldingId, setFormExistingHoldingId] = useState<string>("");
  const [formIsNewHolding, setFormIsNewHolding] = useState(false);
  const [formSymbol, setFormSymbol] = useState("");
  const [formName, setFormName] = useState("");
  const [formAccountName, setFormAccountName] = useState("");
  const [formCurrency, setFormCurrency] = useState("GBP");
  const [formShares, setFormShares] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formNotes, setFormNotes] = useState("");
  const [formIsBuy, setFormIsBuy] = useState(true);

  const initialized = useMemo(() => {
    if (getPortfolioData && isPortfolioArray(getPortfolioData)) {
      setPortfolios(getPortfolioData);
      const allHoldings = getPortfolioData.flatMap(p => p.holdings || []);
      setHoldings(allHoldings);
      return true;
    }
    return false;
  }, [getPortfolioData]);

  useBodyScrollLock(showAddForm);

  const portfolioHoldings = useMemo(() => {
    if (!formPortfolioId) return [];
    return holdings.filter(h => h.portfolioId === formPortfolioId);
  }, [holdings, formPortfolioId]);

  const selectedHolding = useMemo(() => {
    if (!formExistingHoldingId) return null;
    return holdings.find(h => h._id === formExistingHoldingId) || null;
  }, [holdings, formExistingHoldingId]);

  const holdingCurrencyMap = useMemo(() => {
    const map: Record<string, string> = {};
    holdings.forEach(h => {
      if (h._id) {
        map[h._id] = h.currency || "GBP";
      }
    });
    return map;
  }, [holdings]);

  // Format value in GBP - totals are already converted in useMemo
  const formatCurrencyValue = (value: number) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
    }).format(value);
  };

  const previewValues = useMemo(() => {
    const shares = parseFloat(formShares) || 0;
    const price = parseFloat(formPrice) || 0;
    const transactionValue = shares * price;

    if (formIsNewHolding) {
      if (formIsBuy && shares > 0 && price > 0) {
        return {
          currentShares: 0,
          newShares: shares,
          currentValue: 0,
          newValue: transactionValue,
          avgPrice: price,
          transactionValue,
          willCreate: true,
        };
      }
      return null;
    }

    if (!selectedHolding) {
      return null;
    }

    let newShares: number;
    let newAvgPrice: number;
    const currentShares = selectedHolding.shares;
    const currentAvgPrice = selectedHolding.avgPrice;

    if (formIsBuy) {
      newShares = currentShares + shares;
      const totalCost = (currentShares * currentAvgPrice) + transactionValue;
      newAvgPrice = newShares > 0 ? totalCost / newShares : 0;
    } else {
      newShares = currentShares - shares;
      newAvgPrice = currentAvgPrice;
    }

    const currentValue = currentShares * currentAvgPrice;
    const newValue = newShares * newAvgPrice;

    return {
      currentShares,
      newShares: Math.max(0, newShares),
      currentValue,
      newValue,
      avgPrice: newAvgPrice,
      transactionValue,
      willCreate: !formIsBuy && shares > currentShares,
      willDelete: !formIsBuy && shares >= currentShares,
    };
  }, [selectedHolding, formShares, formPrice, formIsBuy, formIsNewHolding]);

  const portfolioMap = useMemo(() => {
    const map: Record<string, string> = {};
    portfolios.forEach(p => {
      map[p._id] = p.name;
    });
    return map;
  }, [portfolios]);

  const filteredEvents = useMemo(() => {
    if (!buySellEvents || "error" in buySellEvents) return [];
    let filtered = [...buySellEvents];
    if (selectedPortfolioId !== "all") {
      filtered = filtered.filter(e => e.portfolioId === selectedPortfolioId);
    }
    const now = new Date();
    const thisYear = now.getFullYear();
    const lastYear = thisYear - 1;
    if (dateFilter === "this_year") {
      filtered = filtered.filter(e => new Date(e.purchaseDate).getFullYear() === thisYear);
    } else if (dateFilter === "last_year") {
      filtered = filtered.filter(e => new Date(e.purchaseDate).getFullYear() === lastYear);
    }
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "purchaseDate":
          comparison = new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime();
          break;
        case "symbol":
          comparison = a.symbol.localeCompare(b.symbol);
          break;
        case "buyShares":
          comparison = a.buyShares - b.buyShares;
          break;
        case "pricePerShare":
          comparison = a.pricePerShare - b.pricePerShare;
          break;
        case "totalValue":
          comparison = (a.buyShares * a.pricePerShare) - (b.buyShares * b.pricePerShare);
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });
    return filtered;
  }, [buySellEvents, selectedPortfolioId, dateFilter, sortField, sortDirection]);

  const totals = useMemo(() => {
    let totalBought = 0;
    let totalSold = 0;
    filteredEvents.forEach(e => {
      const currency = e.currency || holdingCurrencyMap[e.holdingId || ""] || "GBP";
      const value = e.buyShares * e.pricePerShare;
      const valueInGBP = getPriceInPounds(value, currency);
      if (e.buyShares > 0) {
        totalBought += valueInGBP;
      } else {
        totalSold += Math.abs(valueInGBP);
      }
    });
    return { totalBought, totalSold, net: totalBought - totalSold };
  }, [filteredEvents, holdingCurrencyMap]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const resetForm = () => {
    setFormPortfolioId("");
    setFormPortfolioName("");
    setFormExistingHoldingId("");
    setFormIsNewHolding(false);
    setFormSymbol("");
    setFormName("");
    setFormAccountName("");
    setFormCurrency("GBP");
    setFormShares("");
    setFormPrice("");
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormNotes("");
    setFormIsBuy(true);
  };

  const handleOpenAddDialog = () => {
    resetForm();
    if (portfolios.length > 0) {
      setFormPortfolioId(portfolios[0]._id);
      setFormPortfolioName(portfolios[0].name);
    }
    setShowAddForm(true);
  };

  const handleCloseDialog = () => {
    if (transactionQueue.length > 0) {
      setShowCancelConfirm(true);
    } else {
      setShowAddForm(false);
      resetForm();
    }
  };

  const confirmClose = () => {
    setShowAddForm(false);
    setTransactionQueue([]);
    resetForm();
  };

  const addToQueue = () => {
    const newTxn: TransactionFormData = {
      id: Date.now().toString(),
      portfolioId: formPortfolioId,
      portfolioName: formPortfolioName,
      holdingId: formExistingHoldingId,
      isNewHolding: formIsNewHolding,
      symbol: formSymbol,
      name: formName,
      accountName: selectedHolding?.accountName,
      currency: formCurrency,
      shares: formShares,
      price: formPrice,
      date: formDate,
      notes: formNotes,
      isBuy: formIsBuy,
    };
    setTransactionQueue([...transactionQueue, newTxn]);

    // Reset form for next entry but keep portfolio
    setFormExistingHoldingId("");
    setFormIsNewHolding(false);
    setFormSymbol("");
    setFormName("");
    setFormAccountName("");
    setFormCurrency("GBP");
    setFormShares("");
    setFormPrice("");
    setFormNotes("");
    setFormIsBuy(true);
  };

  const removeFromQueue = (id: string) => {
    setTransactionQueue(transactionQueue.filter(t => t.id !== id));
  };

  const handleSaveTransactions = async () => {
    setIsSaving(true);
    try {
      // Save any current form as well
      const currentTxn = isFormValid ? [{
        id: Date.now().toString(),
        portfolioId: formPortfolioId,
        portfolioName: formPortfolioName,
        holdingId: formExistingHoldingId,
        isNewHolding: formIsNewHolding,
        symbol: formSymbol,
        name: formName,
        accountName: selectedHolding?.accountName,
        currency: formCurrency,
        shares: formShares,
        price: formPrice,
        date: formDate,
        notes: formNotes,
        isBuy: formIsBuy,
      }] : [];

      const allTransactions = [...transactionQueue, ...currentTxn].filter(t => t.shares && t.price && t.symbol);

      for (const txn of allTransactions) {
        const shares = parseFloat(txn.shares);
        const price = parseFloat(txn.price);

        await addBuySellEvent({
          portfolioId: txn.portfolioId as Id<"portfolios">,
          symbol: txn.symbol.toUpperCase(),
          name: txn.name || txn.symbol.toUpperCase(),
          currency: txn.currency,
          accountName: txn.accountName || undefined,
          buyShares: txn.isBuy ? shares : -shares,
          purchaseDate: txn.date,
          pricePerShare: price,
          notes: txn.notes || undefined,
        });
      }

      setShowAddForm(false);
      setTransactionQueue([]);
      resetForm();
    } catch (error) {
      console.error("Failed to add transactions:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm("Are you sure you want to delete this transaction? This will also reverse the holding change.")) {
      return;
    }
    try {
      await deleteBuySellEvent({ eventId: eventId as Id<"buySellEvents"> });
    } catch (error) {
      console.error("Failed to delete transaction:", error);
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
    return sortDirection === "asc" ? <ArrowUp className="h-4 w-4 ml-1" /> : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  const isFormValid = useMemo(() => {
    if (!formPortfolioId || !formShares || parseFloat(formShares) <= 0 || !formPrice || parseFloat(formPrice) <= 0) {
      return false;
    }
    if (formIsNewHolding) {
      return !!formSymbol;
    }
    return !!formExistingHoldingId;
  }, [formPortfolioId, formShares, formPrice, formIsNewHolding, formSymbol, formExistingHoldingId]);

  const progress = useMemo(() => {
    if (!formPortfolioId) return 25;
    if (!formExistingHoldingId && !formIsNewHolding) return 50;
    if (!isFormValid) return 75;
    return 100;
  }, [formPortfolioId, formExistingHoldingId, formIsNewHolding, isFormValid]);

  const queueTotal = useMemo(() => {
    return transactionQueue.reduce((sum, t) => {
      const val = parseFloat(t.shares) * parseFloat(t.price);
      const valInGBP = getPriceInPounds(val, t.currency);
      return sum + (t.isBuy ? valInGBP : -valInGBP);
    }, 0);
  }, [transactionQueue]);

  if (!initialized) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Bought</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrencyValue(totals.totalBought)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Sold</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrencyValue(totals.totalSold)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Net</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totals.net >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrencyValue(totals.net)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Add Button */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <Select value={selectedPortfolioId} onValueChange={setSelectedPortfolioId}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Portfolios" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Portfolios</SelectItem>
              {portfolios.map(p => (<SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={dateFilter} onValueChange={(v: DateFilter) => setDateFilter(v)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="this_year">This Year</SelectItem>
              <SelectItem value="last_year">Last Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleOpenAddDialog} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Transaction
        </Button>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3"><button className="flex items-center font-medium" onClick={() => handleSort("purchaseDate")}>Date <SortIcon field="purchaseDate" /></button></th>
                  <th className="text-left p-3"><button className="flex items-center font-medium" onClick={() => handleSort("symbol")}>Symbol <SortIcon field="symbol" /></button></th>
                  <th className="text-left p-3">Portfolio</th>
                  <th className="text-left p-3">Type</th>
                  <th className="text-right p-3"><button className="flex items-center font-medium ml-auto" onClick={() => handleSort("buyShares")}>Shares <SortIcon field="buyShares" /></button></th>
                  <th className="text-right p-3"><button className="flex items-center font-medium ml-auto" onClick={() => handleSort("pricePerShare")}>Price <SortIcon field="pricePerShare" /></button></th>
                  <th className="text-right p-3"><button className="flex items-center font-medium ml-auto" onClick={() => handleSort("totalValue")}>Total <SortIcon field="totalValue" /></button></th>
                  <th className="text-left p-3">Notes</th>
                  <th className="p-3 w-[50px]"></th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.length === 0 ? (
                  <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">No transactions found</td></tr>
                ) : (
                  filteredEvents.map((event) => {
                    const currency = event.currency || holdingCurrencyMap[event.holdingId || ""] || "GBP";
                    const total = Math.abs(event.buyShares * event.pricePerShare);
                    const totalInGBP = getPriceInPounds(total, currency);
                    const priceInGBP = getPriceInPounds(event.pricePerShare, currency);
                    return (
                      <tr key={event._id} className="border-b hover:bg-muted/30">
                        <td className="p-3">{formatDate(event.purchaseDate)}</td>
                        <td className="p-3 font-medium">{event.symbol}</td>
                        <td className="p-3 text-muted-foreground">{event.portfolioId ? portfolioMap[event.portfolioId] || "Unknown" : "-"}</td>
                        <td className="p-3"><span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${event.buyShares > 0 ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"}`}>{event.buyShares > 0 ? "Buy" : "Sell"}</span></td>
                        <td className="p-3 text-right font-mono">{Math.abs(event.buyShares).toLocaleString("en-GB", { maximumFractionDigits: 4 })}</td>
                        <td className="p-3 text-right font-mono">{formatCurrencyValue(priceInGBP)}</td>
                        <td className="p-3 text-right font-mono font-medium">{formatCurrencyValue(totalInGBP)}</td>
                        <td className="p-3 text-muted-foreground text-sm max-w-[150px] truncate">{event.notes || "-"}</td>
                        <td className="p-3"><Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => event._id && handleDeleteEvent(event._id)}><Trash2 className="h-4 w-4" /></Button></td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add Transaction Dialog */}
      <Dialog open={showAddForm} onOpenChange={(open) => { if (!open) handleCloseDialog(); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              Add Transaction{transactionQueue.length > 0 ? `s (${transactionQueue.length} queued)` : ""}
            </DialogTitle>
            <DialogDescription>
              Select a holding and enter transaction details. You can add multiple transactions at once.
            </DialogDescription>
          </DialogHeader>

          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className={formPortfolioId ? "text-foreground" : ""}>Portfolio</span>
              <span className={(formExistingHoldingId || formIsNewHolding) ? "text-foreground" : ""}>Holding</span>
              <span className={isFormValid ? "text-foreground" : ""}>Details</span>
              <span className={transactionQueue.length > 0 ? "text-foreground" : ""}>Review</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            {/* Left Column - Selection */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Portfolio</label>
                <Select value={formPortfolioId} onValueChange={(v) => { const p = portfolios.find(x => x._id === v); setFormPortfolioId(v); setFormPortfolioName(p?.name || ""); setFormExistingHoldingId(""); setFormIsNewHolding(false); }}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select portfolio" /></SelectTrigger>
                  <SelectContent>
                    {portfolios.map(p => (<SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>

              {formPortfolioId && (
                <div>
                  <label className="text-sm font-medium">Existing Holding</label>
                  <Select value={formExistingHoldingId} onValueChange={(v) => { setFormExistingHoldingId(v); setFormIsNewHolding(false); const h = holdings.find(x => x._id === v); if (h) { setFormSymbol(h.symbol); setFormName(h.name); setFormAccountName(h.accountName || ""); setFormCurrency(h.currency || "GBP"); setFormPrice(h.currentPrice.toString()); }}}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select holding" /></SelectTrigger>
                    <SelectContent>
                      {portfolioHoldings.map(h => (
                        <SelectItem key={h._id} value={h._id || ""}>
                          {h.symbol} - {h.name}
                          {h.accountName && <span className="text-muted-foreground ml-1">({h.accountName})</span>}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!formIsNewHolding && (
                    <Button variant="link" size="sm" className="mt-1 p-0 h-auto text-muted-foreground" onClick={() => { setFormExistingHoldingId(""); setFormIsNewHolding(true); setFormSymbol(""); setFormName(""); setFormAccountName(""); setFormCurrency("GBP"); setFormPrice(""); }}>
                      <CirclePlus className="h-3 w-3 mr-1" />New holding
                    </Button>
                  )}
                </div>
              )}

              {formIsNewHolding && (
                <div className="border rounded-lg p-4 space-y-3 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">New Holding</span>
                    <Button variant="ghost" size="sm" className="h-6 text-muted-foreground" onClick={() => { setFormIsNewHolding(false); setFormSymbol(""); setFormName(""); }}>Cancel</Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-medium">Symbol</label>
                      <Input placeholder="MSFT" value={formSymbol} onChange={(e) => setFormSymbol(e.target.value.toUpperCase())} className="mt-1" />
                    </div>
                    <div>
                      <label className="text-xs font-medium">Currency</label>
                      <Select value={formCurrency} onValueChange={setFormCurrency}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="GBP">GBP</SelectItem>
                          <SelectItem value="GBp">GBp</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium">Name</label>
                    <Input placeholder="Microsoft Corporation" value={formName} onChange={(e) => setFormName(e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Account (optional)</label>
                    <Input placeholder="e.g., S&S ISA" value={formAccountName} onChange={(e) => setFormAccountName(e.target.value)} className="mt-1" />
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Details */}
            <div className="space-y-4">
              {(formExistingHoldingId || formIsNewHolding) && (
                <>
                  <div>
                    <label className="text-sm font-medium">Transaction Type</label>
                    <Select value={formIsBuy ? "buy" : "sell"} onValueChange={(v) => setFormIsBuy(v === "buy")}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="buy">Buy</SelectItem>
                        <SelectItem value="sell">Sell</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium">Shares</label>
                      <Input type="number" step="any" placeholder="100" value={formShares} onChange={(e) => setFormShares(e.target.value)} className="mt-1" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Price</label>
                      <Input type="number" step="any" placeholder="150.00" value={formPrice} onChange={(e) => setFormPrice(e.target.value)} className="mt-1" />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Date</label>
                    <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className="mt-1" />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Notes</label>
                    <Input placeholder="Optional notes" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} className="mt-1" />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Full Width Preview */}
          {isFormValid && previewValues && (
            <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Info className="h-4 w-4" />
                Full Breakdown
              </div>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
                {formIsNewHolding ? (
                  <>
                    <div><span className="text-muted-foreground">Symbol:</span><span className="ml-2 font-medium">{formSymbol}</span></div>
                    <div><span className="text-muted-foreground">Shares:</span><span className="ml-2 font-mono">{parseFloat(formShares).toLocaleString("en-GB", { maximumFractionDigits: 4 })}</span></div>
                    <div><span className="text-muted-foreground">Price:</span><span className="ml-2 font-mono">{formatCurrencyValue(getPriceInPounds(parseFloat(formPrice) || 0, formCurrency))}</span></div>
                    <div className="md:col-span-3"><span className="text-muted-foreground">Total:</span><span className="ml-2 font-mono font-bold">{formatCurrencyValue(getPriceInPounds(previewValues.transactionValue, formCurrency))}</span></div>
                  </>
                ) : selectedHolding && (
                  <>
                    <div><span className="text-muted-foreground">Current:</span><span className="ml-2 font-mono">{selectedHolding.shares.toLocaleString("en-GB", { maximumFractionDigits: 4 })}</span></div>
                    <div><span className="text-muted-foreground">{formIsBuy ? "+Add" : "-Remove"}:</span><span className={`ml-2 font-mono ${formIsBuy ? "text-green-600" : "text-red-600"}`}>{formIsBuy ? "+" : "-"}{parseFloat(formShares).toLocaleString("en-GB", { maximumFractionDigits: 4 })}</span></div>
                    <div><span className="text-muted-foreground">New Total:</span><span className="ml-2 font-mono font-bold">{previewValues.newShares.toLocaleString("en-GB", { maximumFractionDigits: 4 })}</span></div>
                    <div><span className="text-muted-foreground">Avg (old):</span><span className="ml-2 font-mono">{formatCurrencyValue(getPriceInPounds(selectedHolding.avgPrice, formCurrency))}</span></div>
                    <div className="md:col-span-2"><span className="text-muted-foreground">Avg (new):</span><span className="ml-2 font-mono">{formatCurrencyValue(getPriceInPounds(previewValues.avgPrice, formCurrency))}</span></div>
                    <div className="md:col-span-3"><span className="text-muted-foreground">Value:</span><span className="ml-2 font-mono">{formatCurrencyValue(getPriceInPounds(previewValues.newValue, formCurrency))}</span></div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Transaction Queue */}
          {transactionQueue.length > 0 && (
            <div className="border rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between text-sm font-medium">
                <span>Queued Transactions ({transactionQueue.length})</span>
                <span className="text-muted-foreground font-normal">Total: {formatCurrencyValue(queueTotal)}</span>
              </div>
              <div className="max-h-40 overflow-y-auto space-y-2">
                {transactionQueue.map((t) => (
                  <div key={t.id} className="flex items-center justify-between text-sm bg-muted/20 p-2 rounded">
                    <div className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.5 rounded text-xs ${t.isBuy ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{t.isBuy ? "Buy" : "Sell"}</span>
                      <span className="font-medium">{t.symbol}</span>
                      {t.accountName && <span className="text-muted-foreground">({t.accountName})</span>}
                      <span className="text-muted-foreground">{t.shares} @ {formatCurrencyValue(getPriceInPounds(parseFloat(t.price) || 0, t.currency))}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => removeFromQueue(t.id)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2 sm:justify-between">
            <div>
              {isFormValid && (
                <Button variant="outline" onClick={addToQueue} className="gap-1">
                  <Plus className="h-4 w-4" />Add to Queue
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
              <Button onClick={handleSaveTransactions} disabled={isSaving || (!isFormValid && transactionQueue.length === 0)}>
                {isSaving ? "Saving..." : transactionQueue.length > 0 ? `Save ${transactionQueue.length + (isFormValid ? 1 : 0)} Transactions` : "Save Transaction"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation */}
      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved transactions?</AlertDialogTitle>
            <DialogDescription>
              You have {transactionQueue.length} transaction{transactionQueue.length > 1 ? "s" : ""} queued. Are you sure you want to discard them?
            </DialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Editing</AlertDialogCancel>
            <AlertDialogAction onClick={confirmClose}>Discard</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
