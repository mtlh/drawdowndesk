"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Save, Trash2, Plus, TrendingUp, TrendingDown, X } from "lucide-react"
import { Holding, SimpleHolding, isError, isPortfolioArray } from "@/types/portfolios"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { Id } from "../../../../convex/_generated/dataModel"

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

// Helper to convert price from pence to pounds if needed
function getPriceInPounds(price: number, currency: string | undefined): number {
  if (currency === "GBp") {
    return price / 100;
  }
  return price;
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

  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [simpleHoldings, setSimpleHoldings] = useState<SimpleHolding[]>([]);
  const [selectedHoldingId, setSelectedHoldingId] = useState<string | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [editedValues, setEditedValues] = useState<Partial<Holding>>({});
  const [editedSimpleValues, setEditedSimpleValues] = useState<Partial<SimpleHolding>>({});

  useEffect(() => {
    if (
      getPortfolioData &&
      isPortfolioArray(getPortfolioData) &&
      holdings.length === 0
    ) {
      setHoldings(getPortfolioData.flatMap((p) => p.holdings));
      setSimpleHoldings(getPortfolioData.flatMap((p) => p.simpleHoldings || []));
    }
  }, [getPortfolioData, holdings.length]);

  if (!getPortfolioData) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>;
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
      <div className="flex h-screen bg-background">
        <main className="flex-1 overflow-y-auto">
          <div className="p-8">
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

    try {
      if (isCreatingNew) {
        await updateHoldingMutation({
          portfolioId: editedValues.portfolioId as Id<"portfolios">,
          symbol: editedValues.symbol,
          name: editedValues.name,
          accountName: editedValues.accountName,
          holdingType: editedValues.holdingType || "Stock",
          dataType: editedValues.dataType || "etf",
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
          holdingType: editedValues.holdingType || "Stock",
          dataType: editedValues.dataType || "etf",
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
    } catch (error) {
      console.error("Failed to save holding:", error);
      alert("Failed to save holding. Please try again.");
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

    try {
      if (isCreatingNew) {
        await updateSimpleHoldingMutation({
          portfolioId: editedSimpleValues.portfolioId as Id<"portfolios">,
          name: editedSimpleValues.name,
          value: editedSimpleValues.value || 0,
          accountName: editedSimpleValues.accountName,
          holdingType: editedSimpleValues.holdingType,
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
          holdingType: editedSimpleValues.holdingType,
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
    } catch (error) {
      console.error("Failed to save holding:", error);
      alert("Failed to save holding. Please try again.");
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

  // Add new holding - create blank entry
  const addHolding = () => {
    if (isManual) {
      setEditedSimpleValues({
        portfolioId: portfolioId as Id<"portfolios">,
        name: "",
        value: 0,
        accountName: "",
        holdingType: "",
        notes: "",
      });
      setEditedValues({});
    } else {
      setEditedValues({
        portfolioId: portfolioId as Id<"portfolios">,
        symbol: "",
        name: "",
        accountName: "",
        holdingType: "Stock",
        dataType: "etf",
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
    <div className="flex h-screen bg-background">
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.push("/holdings")}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">{portfolio.name}</h1>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-lg font-semibold">£{totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  {!isManual && (
                    <span className={`text-sm ${totalGain >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {totalGain >= 0 ? "+" : ""}£{totalGain.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({totalGainPercent >= 0 ? "+" : ""}{totalGainPercent.toFixed(2)}%)
                    </span>
                  )}
                  {isManual && (
                    <span className="text-sm text-muted-foreground">Manual</span>
                  )}
                </div>
              </div>
            </div>
            <Button onClick={addHolding} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Holding
            </Button>
          </div>

          {/* Holdings Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {isManual ? (
              portfolioSimpleHoldings.length === 0 ? (
                <Card className="col-span-full">
                  <CardContent className="py-12 text-center text-muted-foreground">
                    No holdings yet. Click &quot;Add Holding&quot; to get started.
                  </CardContent>
                </Card>
              ) : (
                portfolioSimpleHoldings.map((holding) => (
                  <Card
                    key={holding._id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedHoldingId === holding._id ? "ring-2 ring-primary" : ""
                    }`}
                    onClick={() => selectHolding(holding._id || null)}
                  >
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{holding.name || "Unnamed"}</div>
                        <div className="text-xs text-muted-foreground truncate">{holding.accountName || "No account"}</div>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <div className="font-semibold">{formatCurrency(holding.value, undefined)}</div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )
            ) : (
              portfolioHoldings.length === 0 ? (
                <Card className="col-span-full">
                  <CardContent className="py-12 text-center text-muted-foreground">
                    No holdings yet. Click &quot;Add Holding&quot; to get started.
                  </CardContent>
                </Card>
              ) : (
                portfolioHoldings.map((holding) => {
                  const currency = holding.currency || "GBP";
                  const marketValue = holding.shares * holding.currentPrice;
                  const marketValueInPounds = getPriceInPounds(marketValue, currency);
                  const cost = holding.shares * holding.avgPrice;
                  const costInPounds = getPriceInPounds(cost, currency);
                  const gainLoss = marketValueInPounds - costInPounds;
                  const gainLossPercent = costInPounds > 0 ? (gainLoss / costInPounds) * 100 : 0;

                  return (
                    <Card
                      key={holding._id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedHoldingId === holding._id ? "ring-2 ring-primary" : ""
                      }`}
                      onClick={() => selectHolding(holding._id || null)}
                    >
                      <CardContent className="flex items-center justify-between p-4">
                        <div className="min-w-0">
                          <div className="font-medium truncate">
                            {holding.symbol}{holding.exchange ? `.${holding.exchange}` : ""}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">{holding.name || "No name"}</div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 ml-4">
                          <div className="text-right hidden md:block">
                            <div className="text-xs text-muted-foreground">{holding.shares} shares</div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-sm">{formatCurrency(marketValue, currency)}</div>
                            {gainLossPercent >= 0 ? (
                              <div className="text-xs text-emerald-600 flex items-center gap-1 justify-end">
                                <TrendingUp className="h-2.5 w-2.5" />
                                +{gainLossPercent.toFixed(1)}%
                              </div>
                            ) : (
                              <div className="text-xs text-red-600 flex items-center gap-1 justify-end">
                                <TrendingDown className="h-2.5 w-2.5" />
                                {gainLossPercent.toFixed(1)}%
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )
            )}
          </div>

          {/* Details Panel */}
          {showDetailsPanel && (
            <Card className="border-t-4 border-t-primary">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <CardTitle>
                  {isCreatingNew ? "Add New Holding" : "Edit Holding"}
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={closePanel}>
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                {isManual ? (
                  <SimpleHoldingForm
                    editedValues={editedSimpleValues}
                    setEditedValues={setEditedSimpleValues}
                    onSave={saveSimpleHolding}
                    onDelete={isCreatingNew ? undefined : deleteSimpleHolding}
                    isCreating={isCreatingNew}
                  />
                ) : (
                  <LiveHoldingForm
                    editedValues={editedValues}
                    setEditedValues={setEditedValues}
                    onSave={saveHolding}
                    onDelete={isCreatingNew ? undefined : deleteHolding}
                    isCreating={isCreatingNew}
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
}: {
  editedValues: Partial<SimpleHolding>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setEditedValues: (values: any) => void;
  onSave: () => void;
  onDelete?: () => void;
  isCreating: boolean;
}) {
  const simpleEdited = editedValues as Partial<SimpleHolding>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="lg:col-span-2">
          <label className="text-sm text-muted-foreground">Name</label>
          <Input
            value={simpleEdited.name || ""}
            onChange={(e) => setEditedValues({ ...simpleEdited, name: e.target.value })}
            placeholder="e.g., Vanguard Global All Cap"
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-sm text-muted-foreground">Value (£)</label>
          <Input
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
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-sm text-muted-foreground">Account</label>
          <Input
            value={simpleEdited.accountName || ""}
            onChange={(e) => setEditedValues({ ...simpleEdited, accountName: e.target.value })}
            placeholder="e.g., S&S ISA"
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-sm text-muted-foreground">Type</label>
          <Input
            value={simpleEdited.holdingType || ""}
            onChange={(e) => setEditedValues({ ...simpleEdited, holdingType: e.target.value })}
            placeholder="e.g., Fund, Pension"
            className="mt-1"
          />
        </div>
      </div>
      <div>
        <label className="text-sm text-muted-foreground">Notes</label>
        <Input
          value={simpleEdited.notes || ""}
          onChange={(e) => setEditedValues({ ...simpleEdited, notes: e.target.value })}
          placeholder="Optional notes"
          className="mt-1"
        />
      </div>
      <div className="flex gap-2">
        <Button onClick={onSave} className="gap-2">
          <Save className="h-4 w-4" />
          {isCreating ? "Create" : "Save"}
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
}: {
  editedValues: Partial<Holding>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setEditedValues: (values: any) => void;
  onSave: () => void;
  onDelete?: () => void;
  isCreating: boolean;
}) {
  const liveEdited = editedValues as Partial<Holding>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-10 gap-4">
        <div className="lg:col-span-2">
          <a
            href="https://api.twelvedata.com/etfs?apikey=demo&country=UK"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Find UK ETFs
          </a>
          <label className="text-sm text-muted-foreground">Symbol</label>
          <Input
            value={liveEdited.symbol || ""}
            onChange={(e) => setEditedValues({ ...liveEdited, symbol: e.target.value })}
            placeholder="e.g., ACWI"
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-sm text-muted-foreground">Exchange</label>
          <Input
            value={liveEdited.exchange || ""}
            onChange={(e) => setEditedValues({ ...liveEdited, exchange: e.target.value })}
            placeholder="e.g., LSE"
            className="mt-1"
          />
        </div>
        <div className="lg:col-span-2">
          <label className="text-sm text-muted-foreground">Name</label>
          <Input
            value={liveEdited.name || ""}
            onChange={(e) => setEditedValues({ ...liveEdited, name: e.target.value })}
            placeholder="e.g., iShares MSCI ACWI"
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-sm text-muted-foreground">Account</label>
          <Input
            value={liveEdited.accountName || ""}
            onChange={(e) => setEditedValues({ ...liveEdited, accountName: e.target.value })}
            placeholder="e.g., S&S ISA"
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-sm text-muted-foreground">Currency</label>
          <Input
            value={liveEdited.currency || "GBP"}
            readOnly
            className="mt-1 bg-muted"
          />
        </div>
        <div>
          <label className="text-sm text-muted-foreground">Type</label>
          <Select
            value={liveEdited.dataType || "etf"}
            onValueChange={(value) => setEditedValues({ ...liveEdited, dataType: value })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="etf">ETF</SelectItem>
              <SelectItem value="stock">Stock</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm text-muted-foreground">Shares</label>
          <Input
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
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-sm text-muted-foreground">
            Avg Price {liveEdited.currency === "GBp" ? "(pence)" : liveEdited.currency === "USD" ? "($)" : liveEdited.currency === "EUR" ? "(€)" : "(£)"}
          </label>
          <Input
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
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-sm text-muted-foreground">
            Current Price {liveEdited.currency === "GBp" ? "(pence)" : liveEdited.currency === "USD" ? "($)" : liveEdited.currency === "EUR" ? "(€)" : "(£)"}
          </label>
          <Input
            type="number"
            step="any"
            value={liveEdited.currentPrice ?? ""}
            readOnly
            placeholder="Auto-filled from API"
            className="mt-1 bg-muted"
          />
        </div>
        <div>
          <label className="text-sm text-muted-foreground">Purchase Date</label>
          <Input
            type="date"
            value={liveEdited.purchaseDate || ""}
            onChange={(e) => setEditedValues({ ...liveEdited, purchaseDate: e.target.value })}
            className="mt-1"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button onClick={onSave} className="gap-2">
          <Save className="h-4 w-4" />
          {isCreating ? "Create" : "Save"}
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
