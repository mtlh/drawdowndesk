"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ArrowLeft, Save, Trash2, Plus, ChevronDown, ChevronRight, TrendingUp, TrendingDown } from "lucide-react"
import { Holding, SimpleHolding, isError, isPortfolioArray } from "@/types/portfolios"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { Id } from "../../../../convex/_generated/dataModel"

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
  const [expandedHoldingId, setExpandedHoldingId] = useState<string | null>(null);
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
    : portfolioHoldings.reduce((sum, h) => sum + h.shares * h.currentPrice, 0);
  const totalCost = isManual
    ? 0
    : portfolioHoldings.reduce((sum, h) => sum + h.shares * h.avgPrice, 0);
  const totalGain = totalValue - totalCost;
  const totalGainPercent = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;

  // Toggle expand a holding
  const toggleHolding = (holdingId: string | null) => {
    if (expandedHoldingId === holdingId) {
      setExpandedHoldingId(null);
      setIsCreatingNew(false);
      setEditedValues({});
      setEditedSimpleValues({});
    } else {
      const holding = portfolioHoldings.find(h => h._id === holdingId) || portfolioSimpleHoldings.find(h => h._id === holdingId);
      if (holding) {
        setExpandedHoldingId(holdingId);
        setIsCreatingNew(false);
        if ('symbol' in holding) {
          setEditedValues(holding);
        } else {
          setEditedSimpleValues(holding);
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
        // Create new holding - don't pass _id
        await updateHoldingMutation({
          portfolioId: editedValues.portfolioId as Id<"portfolios">,
          symbol: editedValues.symbol,
          name: editedValues.name,
          accountName: editedValues.accountName,
          holdingType: editedValues.holdingType || "Stock",
          currency: editedValues.currency || "GBP",
          shares: editedValues.shares || 0,
          avgPrice: editedValues.avgPrice || 0,
          currentPrice: editedValues.currentPrice || 0,
          purchaseDate: editedValues.purchaseDate || new Date().toISOString().split("T")[0],
        });
        // Refresh data
        const newData = await getPortfolioData;
        if (newData && isPortfolioArray(newData)) {
          setHoldings(newData.flatMap((p) => p.holdings));
        }
      } else {
        await updateHoldingMutation({
          _id: expandedHoldingId as Id<"holdings">,
          portfolioId: editedValues.portfolioId as Id<"portfolios">,
          symbol: editedValues.symbol,
          name: editedValues.name,
          accountName: editedValues.accountName,
          holdingType: editedValues.holdingType || "Stock",
          currency: editedValues.currency || "GBP",
          shares: editedValues.shares || 0,
          avgPrice: editedValues.avgPrice || 0,
          currentPrice: editedValues.currentPrice || 0,
          purchaseDate: editedValues.purchaseDate || new Date().toISOString().split("T")[0],
        });
        setHoldings(holdings.map((h) =>
          h._id === expandedHoldingId
            ? { ...editedValues, _id: h._id } as Holding
            : h
        ));
      }
      setExpandedHoldingId(null);
      setIsCreatingNew(false);
      setEditedValues({});
    } catch (error) {
      console.error("Failed to save holding:", error);
      alert("Failed to save holding. Please try again.");
    }
  };

  // Delete holding
  const deleteHolding = async () => {
    if (!expandedHoldingId || !confirm("Are you sure you want to delete this holding?")) {
      return;
    }

    try {
      await deleteHoldingsMutation({ holdingId: expandedHoldingId as Id<"holdings"> });
      setHoldings(holdings.filter((h) => h._id !== expandedHoldingId));
      setExpandedHoldingId(null);
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
          _id: expandedHoldingId as Id<"simpleHoldings">,
          portfolioId: editedSimpleValues.portfolioId as Id<"portfolios">,
          name: editedSimpleValues.name,
          value: editedSimpleValues.value || 0,
          accountName: editedSimpleValues.accountName,
          holdingType: editedSimpleValues.holdingType,
          notes: editedSimpleValues.notes,
        });
        setSimpleHoldings(simpleHoldings.map((h) =>
          h._id === expandedHoldingId
            ? { ...editedSimpleValues, _id: h._id } as SimpleHolding
            : h
        ));
      }
      setExpandedHoldingId(null);
      setIsCreatingNew(false);
      setEditedSimpleValues({});
    } catch (error) {
      console.error("Failed to save holding:", error);
      alert("Failed to save holding. Please try again.");
    }
  };

  // Delete simple holding
  const deleteSimpleHolding = async () => {
    if (!expandedHoldingId || !confirm("Are you sure you want to delete this holding?")) {
      return;
    }

    try {
      await deleteSimpleHoldingMutation({ holdingId: expandedHoldingId as Id<"simpleHoldings"> });
      setSimpleHoldings(simpleHoldings.filter((h) => h._id !== expandedHoldingId));
      setExpandedHoldingId(null);
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
    } else {
      setEditedValues({
        portfolioId: portfolioId as Id<"portfolios">,
        symbol: "",
        name: "",
        accountName: "",
        holdingType: "Stock",
        currency: "GBP",
        shares: 0,
        avgPrice: 0,
        currentPrice: 0,
        purchaseDate: new Date().toISOString().split("T")[0],
      });
    }
    setExpandedHoldingId("new");
    setIsCreatingNew(true);
  };

  const isExpanded = expandedHoldingId !== null;

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
                      {totalGain >= 0 ? "+" : ""}£{totalGain.toFixed(2)} ({totalGainPercent >= 0 ? "+" : ""}{totalGainPercent.toFixed(2)}%)
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

          {/* Holdings List */}
          <div className="space-y-3">
            {isManual ? (
              portfolioSimpleHoldings.length === 0 && !isExpanded ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    No holdings yet. Click &quot;Add Holding&quot; to get started.
                  </CardContent>
                </Card>
              ) : (
                <>
                  {portfolioSimpleHoldings.map((holding) => (
                    <HoldingCard
                      key={holding._id || "new"}
                      holding={holding}
                      isExpanded={expandedHoldingId === holding._id}
                      isCreating={isCreatingNew && expandedHoldingId === "new"}
                      onToggle={() => toggleHolding(holding._id || null)}
                      editedValues={editedSimpleValues}
                      setEditedValues={setEditedSimpleValues}
                      onSave={saveSimpleHolding}
                      onDelete={deleteSimpleHolding}
                      isSimple={true}
                    />
                  ))}
                  {/* Show new holding form if creating */}
                  {isCreatingNew && expandedHoldingId === "new" && (
                    <HoldingCard
                      key="new-simple"
                      holding={{ _id: undefined, portfolioId: portfolioId as Id<"portfolios">, name: "", value: 0, accountName: "", holdingType: "", notes: "" }}
                      isExpanded={true}
                      isCreating={true}
                      onToggle={() => toggleHolding(null)}
                      editedValues={editedSimpleValues}
                      setEditedValues={setEditedSimpleValues}
                      onSave={saveSimpleHolding}
                      onDelete={() => {}}
                      isSimple={true}
                    />
                  )}
                </>
              )
            ) : (
              portfolioHoldings.length === 0 && !isExpanded ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    No holdings yet. Click &quot;Add Holding&quot; to get started.
                  </CardContent>
                </Card>
              ) : (
                <>
                  {portfolioHoldings.map((holding) => {
                    const marketValue = holding.shares * holding.currentPrice;
                    const cost = holding.shares * holding.avgPrice;
                    const gainLoss = marketValue - cost;
                    const gainLossPercent = cost > 0 ? (gainLoss / cost) * 100 : 0;

                    return (
                      <HoldingCard
                        key={holding._id || "new"}
                        holding={holding}
                        isExpanded={expandedHoldingId === holding._id}
                        isCreating={isCreatingNew && expandedHoldingId === "new"}
                        onToggle={() => toggleHolding(holding._id || null)}
                        editedValues={editedValues}
                        setEditedValues={setEditedValues}
                        onSave={saveHolding}
                        onDelete={deleteHolding}
                        isSimple={false}
                        marketValue={marketValue}
                        gainLoss={gainLoss}
                        gainLossPercent={gainLossPercent}
                      />
                    );
                  })}
                  {/* Show new holding form if creating */}
                  {isCreatingNew && expandedHoldingId === "new" && (
                    <HoldingCard
                      key="new-live"
                      holding={{ _id: undefined, portfolioId: portfolioId as Id<"portfolios">, symbol: "", name: "", accountName: "", holdingType: "Stock", currency: "GBP", shares: 0, avgPrice: 0, currentPrice: 0, purchaseDate: "", lastUpdated: "" }}
                      isExpanded={true}
                      isCreating={true}
                      onToggle={() => toggleHolding(null)}
                      editedValues={editedValues}
                      setEditedValues={setEditedValues}
                      onSave={saveHolding}
                      onDelete={() => {}}
                      isSimple={false}
                      marketValue={0}
                      gainLoss={0}
                      gainLossPercent={0}
                    />
                  )}
                </>
              )
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// Holding Card Component
function HoldingCard({
  holding,
  isExpanded,
  isCreating,
  onToggle,
  editedValues,
  setEditedValues,
  onSave,
  onDelete,
  isSimple,
  marketValue = 0,
  gainLoss = 0,
  gainLossPercent = 0,
}: {
  holding: Holding | SimpleHolding;
  isExpanded: boolean;
  isCreating: boolean;
  onToggle: () => void;
  editedValues: Partial<Holding> | Partial<SimpleHolding>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setEditedValues: (values: any) => void;
  onSave: () => void;
  onDelete: () => void;
  isSimple: boolean;
  marketValue?: number;
  gainLoss?: number;
  gainLossPercent?: number;
}) {
  const liveHolding = !isSimple && 'symbol' in holding ? holding : null;
  const simpleHolding = isSimple && 'value' in holding ? holding : null;

  if (isSimple && simpleHolding) {
    // Cast for simple holdings form
    const simpleEdited = editedValues as Partial<SimpleHolding>;
    return (
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardContent className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                <div className="min-w-0">
                  <div className="font-medium truncate">{isCreating ? "New Holding" : (simpleHolding.name || "Unnamed")}</div>
                  <div className="text-xs text-muted-foreground truncate">{simpleHolding.accountName || "No account"}</div>
                </div>
              </div>
              {!isCreating && !isExpanded && (
                <div className="text-right shrink-0">
                  <div className="font-semibold">£{simpleHolding.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                </div>
              )}
            </CardContent>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 space-y-4 pb-4">
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
                {!isCreating && (
                  <Button variant="destructive" onClick={onDelete} className="gap-2">
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                )}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    );
  }

  // Live holding card
  // Cast for live holdings form
  const liveEdited = editedValues as Partial<Holding>;
  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <Card className={isExpanded ? "col-span-full" : ""}>
        <CollapsibleTrigger asChild>
          <CardContent className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3 min-w-0">
              {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
              <div className="min-w-0">
                <div className="font-medium truncate">{isCreating ? "New Holding" : (liveHolding?.symbol || "Unnamed")}</div>
                <div className="text-xs text-muted-foreground truncate">{liveHolding?.name || "No name"}</div>
              </div>
            </div>
            {!isCreating && !isExpanded && (
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right hidden md:block">
                  <div className="text-xs text-muted-foreground">{liveHolding?.shares} shares</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-sm">£{marketValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                  {(gainLoss || 0) >= 0 ? (
                    <div className="text-xs text-emerald-600 flex items-center gap-1 justify-end">
                      <TrendingUp className="h-2.5 w-2.5" />
                      +{(gainLossPercent || 0).toFixed(1)}%
                    </div>
                  ) : (
                    <div className="text-xs text-red-600 flex items-center gap-1 justify-end">
                      <TrendingDown className="h-2.5 w-2.5" />
                      {(gainLossPercent || 0).toFixed(1)}%
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4 pb-4">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
              <div className="lg:col-span-2">
                <label className="text-sm text-muted-foreground">Ticker</label>
                <Input
                  value={liveEdited.symbol || ""}
                  onChange={(e) => setEditedValues({ ...liveEdited, symbol: e.target.value })}
                  placeholder="e.g., ACWI.LON"
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
                <Select
                  value={liveEdited.currency || "GBP"}
                  onValueChange={(value) => setEditedValues({ ...liveEdited, currency: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="GBp">GBp</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
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
                <label className="text-sm text-muted-foreground">Avg Price (£)</label>
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
                <label className="text-sm text-muted-foreground">Current Price (£)</label>
                <Input
                  type="number"
                  step="any"
                  value={liveEdited.currentPrice ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "" || val === "-") {
                      setEditedValues({ ...liveEdited, currentPrice: undefined });
                    } else {
                      const parsed = parseFloat(val);
                      if (!isNaN(parsed)) {
                        setEditedValues({ ...liveEdited, currentPrice: parsed });
                      }
                    }
                  }}
                  placeholder="Enter price"
                  className="mt-1"
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
              {!isCreating && (
                <Button variant="destructive" onClick={onDelete} className="gap-2">
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
