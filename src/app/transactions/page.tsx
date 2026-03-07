"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, ArrowUpDown, ArrowUp, ArrowDown, Trash2, Info, CirclePlus, X, ArrowLeftRight, TrendingUp, TrendingDown, Filter } from "lucide-react";
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
    // Handle new paginated response format
    if (!buySellEvents || "error" in buySellEvents) return [];
    const events = Array.isArray(buySellEvents) ? buySellEvents : buySellEvents.events;
    if (!events) return [];

    let filtered = [...events];
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
    <div className="flex min-h-screen bg-background">
      <main className="flex-1 overflow-y-auto overflow-x-hidden bg-background pr-4">
        <div className="p-4 lg:p-8 space-y-6">
          {/* Header Section */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Transaction Summary */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-600/20">
                <ArrowLeftRight className="w-7 h-7 text-white" />
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Total Transactions</div>
                <div className="text-4xl font-bold tracking-tight">
                  {filteredEvents.length}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {totals.net >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-600" />
                  )}
                  <span className={`text-sm font-medium ${totals.net >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    Net: {formatCurrencyValue(totals.net)}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 flex-1 lg:max-w-2xl">
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 border border-emerald-200/50 dark:border-emerald-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Total Bought</span>
                </div>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrencyValue(totals.totalBought)}</div>
              </div>
              <div className="bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/30 dark:to-red-900/20 border border-red-200/50 dark:border-red-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                  <span className="text-xs font-medium text-red-600 dark:text-red-400">Total Sold</span>
                </div>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrencyValue(totals.totalSold)}</div>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border border-blue-200/50 dark:border-blue-800/50 rounded-xl p-4 sm:col-span-1 col-span-2">
                <div className="flex items-center gap-2 mb-1">
                  <ArrowLeftRight className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Net Total</span>
                </div>
                <div className={`text-2xl font-bold ${totals.net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                  {formatCurrencyValue(totals.net)}
                </div>
              </div>
            </div>
          </div>

          {/* Filters and Add Button */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                <Filter className="w-4 h-4" />
                Filters
              </div>
              <div className="flex items-center gap-1 bg-muted/50 dark:bg-muted/30 p-1 rounded-lg">
                <Select value={selectedPortfolioId} onValueChange={setSelectedPortfolioId}>
                  <SelectTrigger className="w-[160px] h-9 border-0 bg-transparent shadow-none focus:ring-0 text-sm" aria-label="Filter by portfolio">
                    <SelectValue placeholder="Portfolio" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Portfolios</SelectItem>
                    {portfolios.map(p => (<SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>))}
                  </SelectContent>
                </Select>
                <div className="w-px h-5 bg-border" />
                <Select value={dateFilter} onValueChange={(v: DateFilter) => setDateFilter(v)}>
                  <SelectTrigger className="w-[120px] h-9 border-0 bg-transparent shadow-none focus:ring-0 text-sm" aria-label="Filter by date range">
                    <SelectValue placeholder="Date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="this_year">This Year</SelectItem>
                    <SelectItem value="last_year">Last Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(selectedPortfolioId !== "all" || dateFilter !== "all") && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => { setSelectedPortfolioId("all"); setDateFilter("all"); }}
                  className="text-xs h-7 text-muted-foreground hover:text-foreground"
                >
                  Clear filters
                </Button>
              )}
            </div>
            <Button onClick={handleOpenAddDialog} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Transaction
            </Button>
          </div>

      {/* Transactions Table */}
      <Card className="overflow-hidden">
        <div className="px-6 py-4 border-b bg-muted/20 flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Transaction History</h3>
            <p className="text-sm text-muted-foreground">
              {filteredEvents.length} transaction{filteredEvents.length !== 1 ? "s" : ""} • Net: {formatCurrencyValue(totals.net)}
            </p>
          </div>
        </div>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><button className="flex items-center gap-1" onClick={() => handleSort("purchaseDate")}>Date <SortIcon field="purchaseDate" /></button></th>
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><button className="flex items-center gap-1" onClick={() => handleSort("symbol")}>Symbol <SortIcon field="symbol" /></button></th>
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Portfolio</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><button className="flex items-center gap-1 ml-auto" onClick={() => handleSort("buyShares")}>Shares <SortIcon field="buyShares" /></button></th>
                  <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><button className="flex items-center gap-1 ml-auto" onClick={() => handleSort("pricePerShare")}>Price <SortIcon field="pricePerShare" /></button></th>
                  <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><button className="flex items-center gap-1 ml-auto" onClick={() => handleSort("totalValue")}>Total <SortIcon field="totalValue" /></button></th>
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes</th>
                  <th className="px-6 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredEvents.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center max-w-sm mx-auto">
                        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
                          <ArrowLeftRight className="w-7 h-7 text-muted-foreground" />
                        </div>
                        <p className="text-lg font-semibold mb-2">No transactions yet</p>
                        <p className="text-sm text-muted-foreground mb-6 text-center">
                          Add your first transaction to start tracking your trades.
                        </p>
                        <Button onClick={handleOpenAddDialog} className="gap-2">
                          <Plus className="h-4 w-4" />
                          Add Transaction
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredEvents.map((event) => {
                    const currency = event.currency || holdingCurrencyMap[event.holdingId || ""] || "GBP";
                    const total = Math.abs(event.buyShares * event.pricePerShare);
                    const totalInGBP = getPriceInPounds(total, currency);
                    const priceInGBP = getPriceInPounds(event.pricePerShare, currency);
                    return (
                      <tr key={event._id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4">{formatDate(event.purchaseDate)}</td>
                        <td className="px-6 py-4 font-medium">{event.symbol}</td>
                        <td className="px-6 py-4 text-muted-foreground">{event.portfolioId ? portfolioMap[event.portfolioId] || "Unknown" : "-"}</td>
                        <td className="px-6 py-4"><span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${event.buyShares > 0 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>{event.buyShares > 0 ? "Buy" : "Sell"}</span></td>
                        <td className="px-6 py-4 text-right font-mono">{Math.abs(event.buyShares).toLocaleString("en-GB", { maximumFractionDigits: 4 })}</td>
                        <td className="px-6 py-4 text-right font-mono">{formatCurrencyValue(priceInGBP)}</td>
                        <td className="px-6 py-4 text-right font-mono font-semibold">{formatCurrencyValue(totalInGBP)}</td>
                        <td className="px-6 py-4 text-muted-foreground text-sm max-w-[150px] truncate">{event.notes || "-"}</td>
                        <td className="px-6 py-4 text-right"><Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive" aria-label="Delete transaction" onClick={() => event._id && handleDeleteEvent(event._id)}><Trash2 className="h-4 w-4" /></Button></td>
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
          <DialogHeader className="pb-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <ArrowLeftRight className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <DialogTitle className="text-xl">
                    Add Transaction{transactionQueue.length > 0 ? `s (${transactionQueue.length} queued)` : ""}
                  </DialogTitle>
                  <DialogDescription className="text-sm">
                    Select a holding and enter transaction details. You can add multiple transactions at once.
                  </DialogDescription>
                </div>
              </div>
            </div>
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
                <label htmlFor="portfolio" className="text-sm font-medium">Portfolio</label>
                <Select value={formPortfolioId} onValueChange={(v) => { const p = portfolios.find(x => x._id === v); setFormPortfolioId(v); setFormPortfolioName(p?.name || ""); setFormExistingHoldingId(""); setFormIsNewHolding(false); }}>
                  <SelectTrigger id="portfolio" className="mt-1" aria-label="Select portfolio"><SelectValue placeholder="Select portfolio" /></SelectTrigger>
                  <SelectContent>
                    {portfolios.map(p => (<SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>

              {formPortfolioId && (
                <div>
                  <label htmlFor="existing-holding" className="text-sm font-medium">Existing Holding</label>
                  <Select value={formExistingHoldingId} onValueChange={(v) => { setFormExistingHoldingId(v); setFormIsNewHolding(false); const h = holdings.find(x => x._id === v); if (h) { setFormSymbol(h.symbol); setFormName(h.name); setFormAccountName(h.accountName || ""); setFormCurrency(h.currency || "GBP"); setFormPrice(h.currentPrice.toString()); }}}>
                    <SelectTrigger id="existing-holding" className="mt-1" aria-label="Select existing holding"><SelectValue placeholder="Select holding" /></SelectTrigger>
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
                      <label htmlFor="symbol" className="text-xs font-medium">Symbol</label>
                      <Input id="symbol" placeholder="MSFT" value={formSymbol} onChange={(e) => setFormSymbol(e.target.value.toUpperCase())} className="mt-1" />
                    </div>
                    <div>
                      <label htmlFor="currency" className="text-xs font-medium">Currency</label>
                      <Select value={formCurrency} onValueChange={setFormCurrency}>
                        <SelectTrigger id="currency" className="mt-1" aria-label="Select currency"><SelectValue /></SelectTrigger>
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
                    <label htmlFor="holding-name" className="text-xs font-medium">Name</label>
                    <Input id="holding-name" placeholder="Microsoft Corporation" value={formName} onChange={(e) => setFormName(e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <label htmlFor="account-name" className="text-xs font-medium">Account (optional)</label>
                    <Input id="account-name" placeholder="e.g., S&S ISA" value={formAccountName} onChange={(e) => setFormAccountName(e.target.value)} className="mt-1" />
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Details */}
            <div className="space-y-4">
              {(formExistingHoldingId || formIsNewHolding) && (
                <>
                  <div>
                    <label htmlFor="transaction-type" className="text-sm font-medium">Transaction Type</label>
                    <Select value={formIsBuy ? "buy" : "sell"} onValueChange={(v) => setFormIsBuy(v === "buy")}>
                      <SelectTrigger id="transaction-type" className="mt-1" aria-label="Select transaction type"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="buy">Buy</SelectItem>
                        <SelectItem value="sell">Sell</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="shares" className="text-sm font-medium">Shares</label>
                      <Input id="shares" type="number" step="any" placeholder="100" value={formShares} onChange={(e) => setFormShares(e.target.value)} className="mt-1" />
                    </div>
                    <div>
                      <label htmlFor="price" className="text-sm font-medium">Price</label>
                      <Input id="price" type="number" step="any" placeholder="150.00" value={formPrice} onChange={(e) => setFormPrice(e.target.value)} className="mt-1" />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="date" className="text-sm font-medium">Date</label>
                    <Input id="date" type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className="mt-1" />
                  </div>

                  <div>
                    <label htmlFor="notes" className="text-sm font-medium">Notes</label>
                    <Input id="notes" placeholder="Optional notes" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} className="mt-1" />
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
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" aria-label="Remove from queue" onClick={() => removeFromQueue(t.id)}>
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
      </main>
    </div>
  );
}
