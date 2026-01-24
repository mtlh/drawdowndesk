"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Save, Trash2, InfoIcon, Plus } from "lucide-react"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
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
  const [editingHolding, setEditingHolding] = useState<string | null>(null);
  const [editingSimpleHolding, setEditingSimpleHolding] = useState<string | null>(null);
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
    return <div>Loading portfolio…</div>;
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

  // Start editing a holding
  const startEditing = (holding: Holding) => {
    if (holding._id) setEditingHolding(holding._id);
    setEditedValues(holding);
  };

  // Save edited holding
  const saveHolding = async () => {
    if (editingHolding && editedValues) {
      if (!editedValues.symbol || !editedValues.name || !editedValues.portfolioId) {
        alert("Please fill in all required fields (Symbol, Name)");
        return;
      }

      try {
        await updateHoldingMutation({
          _id: editingHolding === "new" ? undefined : (editingHolding as Id<"holdings">),
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

        // Update local state with the saved values
        if (editingHolding === "new") {
          // For new holdings, add to the list
          setHoldings([...holdings.filter((_, idx) => idx !== holdings.length - 1), editedValues as Holding]);
        } else {
          // For existing holdings, update the specific holding
          setHoldings(
            holdings.map((h) =>
              h._id === editingHolding
                ? { ...editedValues, _id: h._id } as Holding
                : h
            )
          );
        }
        setEditingHolding(null);
        setEditedValues({});
      } catch (error) {
        console.error("Failed to save holding:", error);
        alert("Failed to save holding. Please try again.");
      }
    }
  };

  // Delete holding
  const deleteHolding = async (id: Id<"holdings"> | undefined) => {
    if (!id) return;

    if (!confirm("Are you sure you want to delete this holding?")) {
      return;
    }

    try {
      await deleteHoldingsMutation({ holdingId: id as Id<"holdings"> });
      setHoldings(holdings.filter((h) => h._id !== id));
    } catch (error) {
      console.error("Failed to delete holding:", error);
      alert("Failed to delete holding. Please try again.");
    }
  };

  // Add new holding
  const addHolding = () => {
    if (isManual) {
      const newSimpleHolding: SimpleHolding = {
        _id: undefined,
        portfolioId: portfolioId as Id<"portfolios">,
        name: "",
        value: 0,
        accountName: "",
        holdingType: "",
        notes: "",
      };
      setSimpleHoldings([...simpleHoldings, newSimpleHolding]);
      setEditingSimpleHolding("new");
      setEditedSimpleValues(newSimpleHolding);
    } else {
      const newHolding: Holding = {
        _id: undefined,
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
      };
      setHoldings([...holdings, newHolding]);
      setEditingHolding("new");
      setEditedValues(newHolding);
    }
  };

  // Start editing a simple holding
  const startEditingSimple = (holding: SimpleHolding) => {
    if (holding._id) setEditingSimpleHolding(holding._id);
    setEditedSimpleValues(holding);
  };

  // Save edited simple holding
  const saveSimpleHolding = async () => {
    if (editingSimpleHolding && editedSimpleValues) {
      if (!editedSimpleValues.name || editedSimpleValues.portfolioId === undefined) {
        alert("Please fill in all required fields (Name, Value)");
        return;
      }

      try {
        await updateSimpleHoldingMutation({
          _id: editingSimpleHolding === "new" ? undefined : (editingSimpleHolding as Id<"simpleHoldings">),
          portfolioId: editedSimpleValues.portfolioId as Id<"portfolios">,
          name: editedSimpleValues.name,
          value: editedSimpleValues.value || 0,
          accountName: editedSimpleValues.accountName,
          holdingType: editedSimpleValues.holdingType,
          notes: editedSimpleValues.notes,
        });

        // Update local state with the saved values
        if (editingSimpleHolding === "new") {
          // For new holdings, add to the list
          setSimpleHoldings([...simpleHoldings.filter((_, idx) => idx !== simpleHoldings.length - 1), editedSimpleValues as SimpleHolding]);
        } else {
          // For existing holdings, update the specific holding
          setSimpleHoldings(
            simpleHoldings.map((h) =>
              h._id === editingSimpleHolding
                ? { ...editedSimpleValues, _id: h._id } as SimpleHolding
                : h
            )
          );
        }
        setEditingSimpleHolding(null);
        setEditedSimpleValues({});
      } catch (error) {
        console.error("Failed to save holding:", error);
        alert("Failed to save holding. Please try again.");
      }
    }
  };

  // Delete simple holding
  const deleteSimpleHolding = async (id: Id<"simpleHoldings"> | undefined) => {
    if (!id) return;

    if (!confirm("Are you sure you want to delete this holding?")) {
      return;
    }

    try {
      await deleteSimpleHoldingMutation({ holdingId: id });
      setSimpleHoldings(simpleHoldings.filter((h) => h._id !== id));
    } catch (error) {
      console.error("Failed to delete holding:", error);
      alert("Failed to delete holding. Please try again.");
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          <div className="mb-8">
            <Button variant="ghost" onClick={() => router.push("/holdings")} className="gap-2 mb-4">
              <ArrowLeft className="h-4 w-4" />
              Back to Holdings
            </Button>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">{portfolio.name}</h1>
                <p className="text-muted-foreground mt-2">
                  Total Value: £{totalValue.toFixed(2)}
                  {!isManual && (
                    <> • Gain:{" "}
                      <span className={totalGain >= 0 ? "text-green-600" : "text-red-600"}>
                        £{totalGain.toFixed(2)} ({totalGainPercent.toFixed(2)}%)
                      </span>
                    </>
                  )}
                  {isManual && (
                    <> • Manual Portfolio</>
                  )}
                </p>
              </div>
              <Button onClick={addHolding} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Holding
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="p-6">
              {isManual ? (
                portfolioSimpleHoldings.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    No holdings in this portfolio yet.
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-right">Name</TableHead>
                          <TableHead className="text-right">Account</TableHead>
                          <TableHead className="text-right">Type</TableHead>
                          <TableHead className="text-right">Value</TableHead>
                          <TableHead className="text-right">Notes</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {portfolioSimpleHoldings.map((holding, index) => {
                          const isEditing = editingSimpleHolding === holding._id || (editingSimpleHolding === "new" && index === portfolioSimpleHoldings.length - 1 && !holding._id);
                          return (
                            <TableRow key={holding._id || `new-${index}`} className="text-right">
                              <TableCell>
                                {isEditing ? (
                                  <Input
                                    value={editedSimpleValues.name || ""}
                                    onChange={(e) =>
                                      setEditedSimpleValues({
                                        ...editedSimpleValues,
                                        name: e.target.value,
                                      })
                                    }
                                    style={{ width: `${(editedSimpleValues.name?.length || 1) + 5}ch` }}
                                    className="h-8 text-right"
                                  />
                                ) : (
                                  <span
                                    className="cursor-pointer hover:underline"
                                    onClick={() => startEditingSimple(holding)}
                                  >
                                    {holding.name || "-"}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                {isEditing ? (
                                  <Input
                                    value={editedSimpleValues.accountName || ""}
                                    onChange={(e) =>
                                      setEditedSimpleValues({
                                        ...editedSimpleValues,
                                        accountName: e.target.value,
                                      })
                                    }
                                    style={{ width: `${(editedSimpleValues.accountName?.length || 1) + 5}ch` }}
                                    className="h-8 text-right"
                                    placeholder="e.g., S&S ISA"
                                  />
                                ) : (
                                  <span
                                    className="cursor-pointer hover:underline"
                                    onClick={() => startEditingSimple(holding)}
                                  >
                                    {holding.accountName || "-"}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                {isEditing ? (
                                  <Input
                                    value={editedSimpleValues.holdingType || ""}
                                    onChange={(e) =>
                                      setEditedSimpleValues({
                                        ...editedSimpleValues,
                                        holdingType: e.target.value,
                                      })
                                    }
                                    style={{ width: `${(editedSimpleValues.holdingType?.length || 1) + 5}ch` }}
                                    className="h-8 text-right"
                                    placeholder="e.g., Fund"
                                  />
                                ) : (
                                  <span
                                    className="cursor-pointer hover:underline"
                                    onClick={() => startEditingSimple(holding)}
                                  >
                                    {holding.holdingType || "-"}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                {isEditing ? (
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={editedSimpleValues.value || 0}
                                    onChange={(e) =>
                                      setEditedSimpleValues({
                                        ...editedSimpleValues,
                                        value: Number.parseFloat(e.target.value),
                                      })
                                    }
                                    style={{ width: `${(editedSimpleValues.value?.toString()?.length || 1) + 8}ch` }}
                                    className="h-8 text-right"
                                  />
                                ) : (
                                  <span
                                    className="cursor-pointer hover:underline"
                                    onClick={() => startEditingSimple(holding)}
                                  >
                                    £{holding.value.toFixed(2)}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                {isEditing ? (
                                  <Input
                                    value={editedSimpleValues.notes || ""}
                                    onChange={(e) =>
                                      setEditedSimpleValues({
                                        ...editedSimpleValues,
                                        notes: e.target.value,
                                      })
                                    }
                                    style={{ width: `${(editedSimpleValues.notes?.length || 1) + 5}ch` }}
                                    className="h-8 text-right"
                                    placeholder="Optional notes"
                                  />
                                ) : (
                                  <span
                                    className="cursor-pointer hover:underline"
                                    onClick={() => startEditingSimple(holding)}
                                  >
                                    {holding.notes || "-"}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  {isEditing ? (
                                    <Button
                                      size="sm"
                                      variant="default"
                                      onClick={saveSimpleHolding}
                                      className="h-8 gap-1"
                                    >
                                      <Save className="h-3 w-3" />
                                      Save
                                    </Button>
                                  ) : (
                                    <Button size="sm" variant="ghost" onClick={() => deleteSimpleHolding(holding._id)}>
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )
              ) : portfolioHoldings.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  No holdings in this portfolio yet.
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <InfoIcon className="size-4 text-muted-foreground cursor-pointer" />
                              </TooltipTrigger>
                              <TooltipContent side="right" align="center">
                                <p className="bg-white p-2 rounded-2xl">
                                  In the format of Ticker.Exchange eg. ACWI.LON
                                </p>
                              </TooltipContent>
                            </Tooltip>
                            <span>Ticker</span>
                          </div>
                        </TableHead>
                        <TableHead className="text-right">Name</TableHead>
                        <TableHead className="text-right">Account</TableHead>
                        <TableHead className="text-right">Type</TableHead>
                        <TableHead className="text-right">Shares</TableHead>
                        <TableHead className="text-right">Avg Price</TableHead>
                        <TableHead className="text-right">Current Price</TableHead>
                        <TableHead className="text-right">Purchase Date</TableHead>
                        <TableHead className="text-right">Market Value</TableHead>
                        <TableHead className="text-right">Gain/Loss</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                        <TableBody>
                          {portfolioHoldings.map((holding, index) => {
                            const isEditing = editingHolding === holding._id || (editingHolding === "new" && index === portfolioHoldings.length - 1 && !holding._id);
                        const marketValue = holding.shares * holding.currentPrice;
                        const cost = holding.shares * holding.avgPrice;
                        const gainLoss = marketValue - cost;
                        const gainLossPercent = cost > 0 ? (gainLoss / cost) * 100 : 0;

                        return (
                          <TableRow key={holding._id || `new-${index}`} className="text-right">
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
                                  style={{ width: `${(editedValues.symbol?.length || 1) + 5}ch` }}
                                  className="h-8 text-right"
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
                                  style={{ width: `${(editedValues.name?.length || 1) + 5}ch` }}
                                  className="h-8 text-right"
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
                                  style={{ width: `${(editedValues.accountName?.length || 1) + 5}ch` }}
                                  className="h-8 text-right"
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
                                  style={{ width: `${(editedValues.holdingType?.length || 1) + 5}ch` }}
                                  className="h-8 text-right"
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
                                  step="0.001"
                                  onChange={(e) =>
                                    setEditedValues({
                                      ...editedValues,
                                      shares: Number.parseFloat(e.target.value),
                                    })
                                  }
                                  style={{ width: `${(editedValues.shares?.toString()?.length || 1) + 8}ch` }}
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
                                  style={{ width: `${(editedValues.avgPrice?.toString()?.length || 1) + 8}ch` }}
                                  className="h-8 text-right"
                                />
                              ) : (
                                <span
                                  className="cursor-pointer hover:underline"
                                  onClick={() => startEditing(holding)}
                                >
                                  £{holding.avgPrice.toFixed(2)}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {isEditing ? (
                                <Input
                                  type="number"
                                  value={editedValues.currentPrice || 0}
                                  disabled={true}
                                  className="h-8 text-right"
                                />
                              ) : (
                                <span
                                  className="cursor-pointer hover:underline"
                                  onClick={() => startEditing(holding)}
                                >
                                  £{holding.currentPrice.toFixed(2)}
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
                                  className="h-8 text-right"
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
                              £{marketValue.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={gainLoss >= 0 ? "text-green-600" : "text-red-600"}>
                                £{gainLoss.toFixed(2)} ({gainLossPercent.toFixed(2)}%)
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
                        );
                      })}
                      </TableBody>
                    </Table>
                  </div>
                )
              }
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
