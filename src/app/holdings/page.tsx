"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Save, Trash2, ChevronDown, ChevronRight, X } from "lucide-react"
import { Holding, isError, isPortfolioArray, Portfolio } from "@/types/portfolios"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"

type PortfolioExpanded = {
  portfolio: Portfolio
  id: string
  isExpanded: boolean
}

export default function HoldingsPage() {
  const getPortfolioData = useQuery(api.portfolio.getUserPortfolio.getUserPortfolio, {});
  const updatePortfolioMutation = useMutation(api.portfolio.updateUserPortfolio.updateUserPortfolio);
  const updateHoldingMutation = useMutation(api.portfolio.updateUserHoldings.updateUserHolding);
  const deletePortfolioMutation = useMutation(api.portfolio.deleteUserPortfolio.deleteUserPortfolio);
  const deleteHoldingsMutation = useMutation(api.portfolio.deleteUserHoldings.deleteUserHoldings);

  const [portfolios, setPortfolios] = useState<PortfolioExpanded[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [editingHolding, setEditingHolding] = useState<string | null>(null);
  const [editedValues, setEditedValues] = useState<Partial<Holding>>({});
  const [showNewPortfolioForm, setShowNewPortfolioForm] = useState(false);
  const [newPortfolioName, setNewPortfolioName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

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
        isExpanded: true,
      }));

      setPortfolios(initialPortfolios);
      setHoldings(getPortfolioData.flatMap((p) => p.holdings));
    }
  }, [getPortfolioData, portfolios.length, holdings.length]);

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
        name: newPortfolioName 
      });

      if (result && 'portfolioId' in result) {
        const newPortfolio: PortfolioExpanded = {
          portfolio: {  
            name: newPortfolioName,
            lastUpdated: new Date().toISOString()
          },
          id: result.portfolioId ?? "",
          isExpanded: true
        };
        
        setPortfolios([...portfolios, newPortfolio]);
        setShowNewPortfolioForm(false);
        setNewPortfolioName("");
      }
    } catch (error) {
      console.error("Failed to create portfolio:", error);
      alert("Failed to create portfolio. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  // Add new holding to a portfolio
  const addHolding = (portfolioId: string) => {
    const newHolding: Holding = {
      _id: `holding-${Date.now()}-` + Math.random().toString(36).slice(2, 2 + 5) + "-" + portfolioId as Id<"holdings">,
      portfolioId: portfolioId as Id<"portfolios">,
      symbol: "",
      name: "",
      accountName: "",
      holdingType: "Stock",
      shares: 0,
      avgPrice: 0,
      currentPrice: 0,
      purchaseDate: new Date().toISOString().split("T")[0],
      lastUpdated: new Date().toISOString(),
    }
    setHoldings([...holdings, newHolding])
    if (newHolding._id) setEditingHolding(newHolding._id);
    setEditedValues(newHolding)
  }

  // Toggle portfolio expansion
  const togglePortfolio = (portfolioId: string) => {
    setPortfolios(portfolios.map((p) => (p.id === portfolioId ? { ...p, isExpanded: !p.isExpanded } : p)))
  }

  // Start editing a holding
  const startEditing = (holding: Holding) => {
    if (holding._id) setEditingHolding(holding._id);
    setEditedValues(holding)
  }

  // Save edited holding
  const saveHolding = async () => {
    if (editingHolding && editedValues) {
      if (!editedValues.symbol || !editedValues.name || !editedValues.portfolioId) {
        alert("Please fill in all required fields (Symbol, Name)");
        return;
      }

      setIsSaving(true);
      try {
        // Call mutation to persist in Convex
        await updateHoldingMutation({
          portfolioId: editedValues.portfolioId as Id<"portfolios">,
          symbol: editedValues.symbol,
          name: editedValues.name,
          accountName: editedValues.accountName,
          holdingType: editedValues.holdingType || "Stock",
          shares: editedValues.shares || 0,
          avgPrice: editedValues.avgPrice || 0,
          currentPrice: editedValues.currentPrice || 0,
          purchaseDate: editedValues.purchaseDate || new Date().toISOString().split("T")[0],
        });

        setHoldings(
          holdings.map((h) =>
            h._id === editingHolding ? { ...h, ...editedValues, lastUpdated: new Date().toISOString() } : h,
          ),
        );
        setEditingHolding(null);
        setEditedValues({});
      } catch (error) {
        console.error("Failed to save holding:", error);
        alert("Failed to save holding. Please try again.");
      } finally {
        setIsSaving(false);
      }
    }
  }

  // Delete holding
  const deleteHolding = async (id: Id<"holdings"> | undefined) => {
    if (!id) return;

    if (!confirm("Are you sure you want to delete this holding?")) {
      return;
    }

    setIsSaving(true);
    try {
      await deleteHoldingsMutation({ holdingId: id as Id<"holdings"> });
      setHoldings(holdings.filter((h) => h._id !== id))
    } catch (error) {
      console.error("Failed to delete holding:", error);
      alert("Failed to delete holding. Please try again.");
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

  // Calculate portfolio totals
  const getPortfolioStats = (portfolioId: string) => {
    const portfolioHoldings = holdings.filter((h) => h.portfolioId === portfolioId)
    const totalValue = portfolioHoldings.reduce((sum, h) => sum + h.shares * h.currentPrice, 0)
    const totalCost = portfolioHoldings.reduce((sum, h) => sum + h.shares * h.avgPrice, 0)
    const totalGain = totalValue - totalCost
    const totalGainPercent = totalCost > 0 ? (totalGain / totalCost) * 100 : 0

    return { totalValue, totalCost, totalGain, totalGainPercent }
  }

  return (
    <div className="flex h-screen bg-background">
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Holdings</h1>
              <p className="text-muted-foreground">Manage your investment portfolios and holdings</p>
            </div>
            <Button onClick={() => setShowNewPortfolioForm(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Portfolio
            </Button>
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
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowNewPortfolioForm(false);
                        setNewPortfolioName("");
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

          <div className="space-y-6">
            {portfolios.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <p className="mb-4 text-muted-foreground">
                    No portfolios yet. Create your first portfolio to get started.
                  </p>
                  <Button onClick={() => setShowNewPortfolioForm(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Portfolio
                  </Button>
                </CardContent>
              </Card>
            ) : (
              portfolios.map((portfolioExpanded) => {
                const stats = getPortfolioStats(portfolioExpanded.id)
                const portfolioHoldings = holdings.filter((h) => h.portfolioId === portfolioExpanded.id)

                return (
                  <Card key={portfolioExpanded.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Button variant="ghost" size="sm" onClick={() => togglePortfolio(portfolioExpanded.id)}>
                            {portfolioExpanded.isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                          <div>
                            <Input
                              value={portfolioExpanded.portfolio.name}
                              onChange={(e) => updatePortfolioName(portfolioExpanded.id, e.target.value)}
                              className="mb-1 border-none p-0 text-xl font-semibold shadow-none focus-visible:ring-0"
                            />
                            <CardDescription>
                              Value: ${stats.totalValue.toFixed(2)} • Gain:{" "}
                              <span className={stats.totalGain >= 0 ? "text-green-600" : "text-red-600"}>
                                ${stats.totalGain.toFixed(2)} ({stats.totalGainPercent.toFixed(2)}%)
                              </span>
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addHolding(portfolioExpanded.id)}
                            className="gap-2"
                          >
                            <Plus className="h-4 w-4" />
                            Add Holding
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => deletePortfolio(portfolioExpanded.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>

                    {portfolioExpanded.isExpanded && (
                      <CardContent>
                        {portfolioHoldings.length === 0 ? (
                          <div className="py-8 text-center text-muted-foreground">
                            No holdings in this portfolio yet.
                          </div>
                        ) : (
                          <div className="rounded-md border">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Symbol</TableHead>
                                  <TableHead>Name</TableHead>
                                  <TableHead>Account</TableHead>
                                  <TableHead>Type</TableHead>
                                  <TableHead className="text-right">Shares</TableHead>
                                  <TableHead className="text-right">Avg Price</TableHead>
                                  <TableHead className="text-right">Current Price</TableHead>
                                  <TableHead>Purchase Date</TableHead>
                                  <TableHead className="text-right">Market Value</TableHead>
                                  <TableHead className="text-right">Gain/Loss</TableHead>
                                  <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {portfolioHoldings.map((holding) => {
                                  const isEditing = editingHolding === holding._id
                                  const marketValue = holding.shares * holding.currentPrice
                                  const cost = holding.shares * holding.avgPrice
                                  const gainLoss = marketValue - cost
                                  const gainLossPercent = cost > 0 ? (gainLoss / cost) * 100 : 0

                                  return (
                                    <TableRow key={holding._id}>
                                      <TableCell>
                                        {isEditing ? (
                                          <Input
                                            value={editedValues.symbol || ""}
                                            onChange={(e) =>
                                              setEditedValues({
                                                ...editedValues,
                                                symbol: e.target.value,
                                              })
                                            }
                                            className="h-8"
                                          />
                                        ) : (
                                          <span
                                            className="cursor-pointer hover:underline"
                                            onClick={() => startEditing(holding)}
                                          >
                                            {holding.symbol || "-"}
                                          </span>
                                        )}
                                      </TableCell>
                                      <TableCell>
                                        {isEditing ? (
                                          <Input
                                            value={editedValues.name || ""}
                                            onChange={(e) =>
                                              setEditedValues({
                                                ...editedValues,
                                                name: e.target.value,
                                              })
                                            }
                                            className="h-8"
                                          />
                                        ) : (
                                          <span
                                            className="cursor-pointer hover:underline"
                                            onClick={() => startEditing(holding)}
                                          >
                                            {holding.name || "-"}
                                          </span>
                                        )}
                                      </TableCell>
                                      <TableCell>
                                        {isEditing ? (
                                          <Input
                                            value={editedValues.accountName || ""}
                                            onChange={(e) =>
                                              setEditedValues({
                                                ...editedValues,
                                                accountName: e.target.value,
                                              })
                                            }
                                            className="h-8"
                                          />
                                        ) : (
                                          <span
                                            className="cursor-pointer hover:underline"
                                            onClick={() => startEditing(holding)}
                                          >
                                            {holding.accountName || "-"}
                                          </span>
                                        )}
                                      </TableCell>
                                      <TableCell>
                                        {isEditing ? (
                                          <Input
                                            value={editedValues.holdingType || ""}
                                            onChange={(e) =>
                                              setEditedValues({
                                                ...editedValues,
                                                holdingType: e.target.value,
                                              })
                                            }
                                            className="h-8"
                                          />
                                        ) : (
                                          <span
                                            className="cursor-pointer hover:underline"
                                            onClick={() => startEditing(holding)}
                                          >
                                            {holding.holdingType}
                                          </span>
                                        )}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {isEditing ? (
                                          <Input
                                            type="number"
                                            value={editedValues.shares || 0}
                                            onChange={(e) =>
                                              setEditedValues({
                                                ...editedValues,
                                                shares: Number.parseFloat(e.target.value),
                                              })
                                            }
                                            className="h-8 text-right"
                                          />
                                        ) : (
                                          <span
                                            className="cursor-pointer hover:underline"
                                            onClick={() => startEditing(holding)}
                                          >
                                            {holding.shares}
                                          </span>
                                        )}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {isEditing ? (
                                          <Input
                                            type="number"
                                            step="0.01"
                                            value={editedValues.avgPrice || 0}
                                            onChange={(e) =>
                                              setEditedValues({
                                                ...editedValues,
                                                avgPrice: Number.parseFloat(e.target.value),
                                              })
                                            }
                                            className="h-8 text-right"
                                          />
                                        ) : (
                                          <span
                                            className="cursor-pointer hover:underline"
                                            onClick={() => startEditing(holding)}
                                          >
                                            ${holding.avgPrice.toFixed(2)}
                                          </span>
                                        )}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {isEditing ? (
                                          <Input
                                            type="number"
                                            step="0.01"
                                            value={editedValues.currentPrice || 0}
                                            onChange={(e) =>
                                              setEditedValues({
                                                ...editedValues,
                                                currentPrice: Number.parseFloat(e.target.value),
                                              })
                                            }
                                            className="h-8 text-right"
                                          />
                                        ) : (
                                          <span
                                            className="cursor-pointer hover:underline"
                                            onClick={() => startEditing(holding)}
                                          >
                                            ${holding.currentPrice.toFixed(2)}
                                          </span>
                                        )}
                                      </TableCell>
                                      <TableCell>
                                        {isEditing ? (
                                          <Input
                                            type="date"
                                            value={editedValues.purchaseDate || ""}
                                            onChange={(e) =>
                                              setEditedValues({
                                                ...editedValues,
                                                purchaseDate: e.target.value,
                                              })
                                            }
                                            className="h-8"
                                          />
                                        ) : (
                                          <span
                                            className="cursor-pointer hover:underline"
                                            onClick={() => startEditing(holding)}
                                          >
                                            {holding.purchaseDate}
                                          </span>
                                        )}
                                      </TableCell>
                                      <TableCell className="text-right font-medium">
                                        ${marketValue.toFixed(2)}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <span className={gainLoss >= 0 ? "text-green-600" : "text-red-600"}>
                                          ${gainLoss.toFixed(2)} ({gainLossPercent.toFixed(2)}%)
                                        </span>
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                          {isEditing ? (
                                            <Button
                                              size="sm"
                                              variant="default"
                                              onClick={saveHolding}
                                              className="h-8 gap-1"
                                            >
                                              <Save className="h-3 w-3" />
                                              Save
                                            </Button>
                                          ) : (
                                            <Button size="sm" variant="ghost" onClick={() => deleteHolding(holding._id)}>
                                              <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                          )}
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  )
                                })}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </CardContent>
                    )}
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
