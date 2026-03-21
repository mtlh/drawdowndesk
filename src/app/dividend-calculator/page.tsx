"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Plus, Trash2, Edit2, DollarSign, AlertCircle } from "lucide-react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { Skeleton, SkeletonCard, SkeletonCardHeader, SkeletonCardContent, SkeletonChart, SkeletonText, SkeletonList } from "@/components/ui/skeleton"
import { useCurrentUser } from "@/hooks/useCurrentUser"

interface Dividend {
  _id: Id<"dividends">
  _creationTime: number
  userId: string
  symbol: string
  name: string
  portfolioId?: Id<"portfolios">
  accountName?: string
  currency?: string
  shares: number
  dividendPerShare: number
  frequency: string
  paymentMonth?: number
  lastUpdated?: string
}

const FREQUENCY_OPTIONS = [
  { value: "annual", label: "Annual" },
  { value: "quarterly", label: "Quarterly" },
  { value: "monthly", label: "Monthly" },
]

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
]

const INCOME_TAX_BANDS = [
  { value: "0", label: "0% (Within allowance)", rate: 0 },
  { value: "basic", label: "Basic Rate (8.75%)", rate: 8.75 },
  { value: "higher", label: "Higher Rate (33.75%)", rate: 33.75 },
  { value: "additional", label: "Additional Rate (39.35%)", rate: 39.35 },
]

const DIVIDEND_ALLOWANCE = 500 // UK dividend allowance

type DividendFormData = {
  symbol: string
  name: string
  portfolioId: string
  accountName: string
  currency: string
  shares: string
  dividendPerShare: string
  frequency: string
  paymentMonth: string
}

export default function DividendCalculatorPage() {
  const user = useCurrentUser()
  const dividendsData = useQuery(api.portfolio.dividends.getDividends, user ? {} : "skip")
  const portfoliosData = useQuery(api.portfolio.getUserPortfolio.getUserPortfolio, user ? {} : "skip")
  
  const addDividendMutation = useMutation(api.portfolio.dividends.addDividend)
  const updateDividendMutation = useMutation(api.portfolio.dividends.updateDividend)
  const deleteDividendMutation = useMutation(api.portfolio.dividends.deleteDividend)

  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingDividend, setEditingDividend] = useState<Dividend | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [incomeTaxBand, setIncomeTaxBand] = useState<string>("0")
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<Id<"dividends"> | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const [formData, setFormData] = useState<DividendFormData>({
    symbol: "",
    name: "",
    portfolioId: "",
    accountName: "",
    currency: "GBP",
    shares: "",
    dividendPerShare: "",
    frequency: "annual",
    paymentMonth: "",
  })

  const portfolios = useMemo(() => {
    if (!portfoliosData || "error" in portfoliosData) {
      return []
    }
    return portfoliosData || []
  }, [portfoliosData])

  type HoldingOption = { key: string; displayKey: string; symbol: string; name: string; accountName?: string; portfolioId?: string; shares: number; avgPrice: number; currency: string }
  type HoldingsByAccount = { accountName: string; holdings: HoldingOption[] }

  const holdingsOptions = useMemo((): { all: HoldingOption[]; byAccount: HoldingsByAccount[] } => {
    if (!portfolios.length) return { all: [], byAccount: [] }
    
    const holdingsList: HoldingOption[] = []

    portfolios.forEach(p => {
      p.holdings?.forEach(h => {
        const displayKey = `${h.symbol}`
        const key = `${h._id}`
        holdingsList.push({
          key,
          displayKey,
          symbol: h.symbol,
          name: h.name,
          accountName: h.accountName,
          portfolioId: h.portfolioId,
          shares: h.shares,
          avgPrice: h.avgPrice,
          currency: h.currency || "GBP"
        })
      })
    })

    const byAccountMap = new Map<string, HoldingOption[]>()
    holdingsList.forEach(h => {
      const account = h.accountName || "Unassigned"
      if (!byAccountMap.has(account)) {
        byAccountMap.set(account, [])
      }
      byAccountMap.get(account)!.push(h)
    })

    const byAccount: HoldingsByAccount[] = Array.from(byAccountMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([accountName, holdings]) => ({
        accountName,
        holdings: holdings.sort((a, b) => a.displayKey.localeCompare(b.displayKey))
      }))

    return { 
      all: holdingsList.sort((a, b) => a.displayKey.localeCompare(b.displayKey)),
      byAccount
    }
  }, [portfolios])

  const dividends = useMemo(() => {
    if (!dividendsData || "error" in dividendsData) return []
    return dividendsData.dividends || []
  }, [dividendsData])

  const calculateAnnualDividend = (dividend: Dividend): number => {
    const base = dividend.shares * dividend.dividendPerShare
    switch (dividend.frequency) {
      case "monthly":
        return base * 12
      case "quarterly":
        return base * 4
      case "annual":
      default:
        return base
    }
  }

  const summary = useMemo(() => {
    const totalAnnual = dividends.reduce((sum, d) => sum + calculateAnnualDividend(d), 0)
    
    const byAccount: Record<string, number> = {}
    const byCurrency: Record<string, number> = {}
    let giaTotal = 0
    
    dividends.forEach(d => {
      const annual = calculateAnnualDividend(d)
      const account = d.accountName || "Unassigned"
      byAccount[account] = (byAccount[account] || 0) + annual
      const currency = d.currency || "GBP"
      byCurrency[currency] = (byCurrency[currency] || 0) + annual
      
      // Check if this is a GIA account (not ISA or Pension)
      const accountLower = account.toLowerCase()
      const isGia = !accountLower.includes('isa') && !accountLower.includes('pension') && !accountLower.includes('sipp') && !accountLower.includes('wsipp')
      if (isGia) {
        giaTotal += annual
      }
    })

    // Calculate tax
    const taxBand = INCOME_TAX_BANDS.find(b => b.value === incomeTaxBand) || INCOME_TAX_BANDS[0]
    const taxableGia = Math.max(0, giaTotal - DIVIDEND_ALLOWANCE)
    const dividendTaxDue = (taxableGia * taxBand.rate) / 100
    const effectiveTaxRate = totalAnnual > 0 ? (dividendTaxDue / totalAnnual) * 100 : 0

    return {
      totalAnnual,
      count: dividends.length,
      byAccount,
      byCurrency,
      giaTotal,
      taxableGia,
      dividendTaxDue,
      effectiveTaxRate,
    }
  }, [dividends, incomeTaxBand])

  const handleHoldingChange = (key: string) => {
    if (key === "custom") {
      setFormData({ ...formData, symbol: "", name: "", accountName: "", shares: "", currency: "GBP" })
    } else if (key === "none") {
      setFormData({ ...formData, symbol: "", name: "", accountName: "", portfolioId: "", shares: "", currency: "GBP" })
    } else {
      const holding = holdingsOptions.all.find(h => h.key === key)
      if (holding) {
        setFormData({ 
          ...formData, 
          symbol: holding.symbol, 
          name: holding.name,
          accountName: holding.accountName || "",
          portfolioId: holding.portfolioId || "",
          shares: holding.shares.toString(),
          currency: holding.currency
        })
      }
    }
  }

  const handleOpenAdd = () => {
    setEditingDividend(null)
    setFormData({
      symbol: "",
      name: "",
      portfolioId: "",
      accountName: "",
      currency: "GBP",
      shares: "",
      dividendPerShare: "",
      frequency: "annual",
      paymentMonth: "",
    })
    setShowAddDialog(true)
  }

  const handleOpenEdit = (dividend: Dividend) => {
    setEditingDividend(dividend)
    setFormData({
      symbol: dividend.symbol,
      name: dividend.name,
      portfolioId: dividend.portfolioId || "",
      accountName: dividend.accountName || "",
      currency: dividend.currency || "GBP",
      shares: dividend.shares.toString(),
      dividendPerShare: dividend.dividendPerShare.toString(),
      frequency: dividend.frequency,
      paymentMonth: dividend.paymentMonth?.toString() || "",
    })
    setShowAddDialog(true)
  }

  const handleSave = async () => {
    if (!formData.symbol || !formData.shares || !formData.dividendPerShare) {
      setFormError("Please fill in required fields")
      return
    }

    setIsSaving(true)
    setFormError(null)
    try {
      const data = {
        symbol: formData.symbol.toUpperCase(),
        name: formData.name || formData.symbol,
        portfolioId: formData.portfolioId ? (formData.portfolioId as Id<"portfolios">) : undefined,
        accountName: formData.accountName || undefined,
        currency: formData.currency,
        shares: parseFloat(formData.shares),
        dividendPerShare: parseFloat(formData.dividendPerShare),
        frequency: formData.frequency,
        paymentMonth: formData.paymentMonth ? parseInt(formData.paymentMonth) : undefined,
      }

      if (editingDividend) {
        await updateDividendMutation({
          dividendId: editingDividend._id,
          ...data,
        })
      } else {
        await addDividendMutation(data)
      }

      setShowAddDialog(false)
    } catch (error) {
      console.error("Failed to save dividend:", error)
      setFormError("Failed to save dividend. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  const confirmDelete = (dividendId: Id<"dividends">) => {
    setDeleteTargetId(dividendId)
    setDeleteConfirmOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return
    try {
      await deleteDividendMutation({ dividendId: deleteTargetId })
    } catch (error) {
      console.error("Failed to delete dividend:", error)
    } finally {
      setDeleteConfirmOpen(false)
      setDeleteTargetId(null)
    }
  }

  if (dividendsData === undefined) {
    return (
      <div className="flex min-h-screen bg-background">
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-background pr-4">
          <div className="p-4 lg:p-8 space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-64" />
              </div>
              <Skeleton className="h-10 w-32" />
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonCard key={i} className="h-[100px] p-6" />
              ))}
            </div>

            <SkeletonCard className="h-[400px] p-6">
              <SkeletonCardHeader className="pb-2">
                <SkeletonText lines={2} />
              </SkeletonCardHeader>
              <SkeletonCardContent>
                <SkeletonChart className="h-[300px]" />
              </SkeletonCardContent>
            </SkeletonCard>

            <SkeletonCard className="h-[400px] p-6">
              <SkeletonCardHeader className="pb-2">
                <SkeletonText lines={2} />
              </SkeletonCardHeader>
              <SkeletonCardContent>
                <SkeletonList count={8} />
              </SkeletonCardContent>
            </SkeletonCard>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <main className="flex-1 overflow-y-auto overflow-x-hidden bg-background pr-4">
        <div className="p-4 lg:p-8">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Dividends</h1>
              <p className="text-muted-foreground mt-1">Track your dividend income and yields</p>
            </div>
            <Button onClick={handleOpenAdd} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Dividend
            </Button>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left Column - Dividends List */}
            <div className="lg:col-span-2 space-y-6">
              {/* Dividends List */}
              <Card>
                <CardHeader>
                  <CardTitle>Dividend Holdings</CardTitle>
                  <CardDescription>Your dividend-paying investments</CardDescription>
                </CardHeader>
                <CardContent>
                  {dividends.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
                        <DollarSign className="w-7 h-7 text-muted-foreground" />
                      </div>
                      <p className="text-lg font-semibold mb-2">No dividends added yet</p>
                      <p className="text-sm text-muted-foreground mb-4">
                        Add your dividend-paying holdings to track your income.
                      </p>
                      <Button onClick={handleOpenAdd}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add First Dividend
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground pb-2 border-b">
                        <div className="col-span-2">Symbol</div>
                        <div className="col-span-3">Name</div>
                        <div className="col-span-2 text-right">Shares</div>
                        <div className="col-span-2 text-right">Div/Share</div>
                        <div className="col-span-2 text-right">Annual</div>
                        <div className="col-span-1"></div>
                      </div>
                      {dividends.map((dividend) => {
                        const annual = calculateAnnualDividend(dividend)
                        return (
                          <div
                            key={dividend._id}
                            className="grid grid-cols-12 gap-4 items-center py-3 border-b last:border-0 hover:bg-muted/30 rounded-lg px-2 -mx-2 transition-colors"
                          >
                            <div className="col-span-2 font-medium">{dividend.symbol}</div>
                            <div className="col-span-3 text-muted-foreground truncate">{dividend.name}</div>
                            <div className="col-span-2 text-right font-mono">{dividend.shares.toLocaleString("en-GB", { maximumFractionDigits: 2 })}</div>
                            <div className="col-span-2 text-right font-mono">
                              {dividend.currency === "GBP" || dividend.currency === "GBp" ? "£" : dividend.currency === "USD" ? "$" : dividend.currency === "EUR" ? "€" : "£"}{dividend.dividendPerShare.toFixed(2)}
                              <span className="text-xs text-muted-foreground ml-1">/{dividend.frequency === "quarterly" ? "qtr" : dividend.frequency === "monthly" ? "mo" : "yr"}</span>
                            </div>
                            <div className="col-span-2 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                              £{annual.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="col-span-1 flex justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEdit(dividend)} aria-label="Edit dividend">
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => confirmDelete(dividend._id)} aria-label="Delete dividend">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Planning */}
            <div className="space-y-6">
              {/* Tax Notice for GIA */}
              {summary.giaTotal > 0 && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-amber-800 dark:text-amber-200">£500 Dividend Allowance</h3>
                      <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                        You have <strong>£{summary.giaTotal.toLocaleString("en-GB", { minimumFractionDigits: 2 })}</strong> in GIA dividends. 
                        The first <strong>£{DIVIDEND_ALLOWANCE}</strong> is tax-free. 
                        Select your income tax band below to calculate potential tax due.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tax Band Selector */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Tax Calculator</CardTitle>
                  <CardDescription>Calculate your dividend tax</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Income Tax Band</label>
                      <Select value={incomeTaxBand} onValueChange={setIncomeTaxBand}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select tax band" />
                        </SelectTrigger>
                        <SelectContent>
                          {INCOME_TAX_BANDS.map((band) => (
                            <SelectItem key={band.value} value={band.value}>
                              {band.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-sm text-muted-foreground">Taxable GIA</div>
                      <div className="text-sm font-semibold text-right">£{summary.taxableGia.toLocaleString("en-GB", { minimumFractionDigits: 2 })}</div>
                      <div className="text-sm text-muted-foreground">Est. Tax Due</div>
                      <div className="text-sm font-semibold text-red-600 dark:text-red-400 text-right">
                        £{summary.dividendTaxDue.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-sm text-muted-foreground font-medium">Net After Tax</div>
                      <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 text-right">
                        £{(summary.totalAnnual - summary.dividendTaxDue).toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Summary Cards */}
              <div className="grid gap-4 sm:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Annual</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      £{summary.totalAnnual.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <p className="text-xs text-muted-foreground">per year</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Monthly Avg</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      £{(summary.totalAnnual / 12).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <p className="text-xs text-muted-foreground">per month</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Holdings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{summary.count}</div>
                    <p className="text-xs text-muted-foreground">stocks</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Tax Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{summary.effectiveTaxRate.toFixed(2)}%</div>
                    <p className="text-xs text-muted-foreground">effective</p>
                  </CardContent>
                </Card>
              </div>

              {/* By Account Breakdown */}
              {Object.keys(summary.byAccount).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">By Account</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(summary.byAccount).map(([account, amount]) => (
                        <div key={account} className="flex justify-between items-center">
                          <span className="text-sm font-medium">{account}</span>
                          <span className="font-mono">£{amount.toLocaleString("en-GB", { minimumFractionDigits: 2 })}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* By Currency Breakdown */}
              {Object.keys(summary.byCurrency).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">By Currency</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(summary.byCurrency).map(([currency, amount]) => (
                        <div key={currency} className="flex justify-between items-center">
                          <span className="text-sm font-medium">{currency}</span>
                          <span className="font-mono">£{amount.toLocaleString("en-GB", { minimumFractionDigits: 2 })}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingDividend ? "Edit Dividend" : "Add Dividend"}</DialogTitle>
            <DialogDescription>
              Enter the dividend details for your holding.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="holding">Holding *</Label>
              {holdingsOptions.all.length > 0 ? (
                <Select 
                  value={holdingsOptions.all.some(h => h.symbol === formData.symbol && h.accountName === formData.accountName) ? holdingsOptions.all.find(h => h.symbol === formData.symbol && h.accountName === formData.accountName)?.key || "none" : (formData.symbol ? "custom" : "none")} 
                  onValueChange={handleHoldingChange}
                >
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select holding" /></SelectTrigger>
                  <SelectContent className="max-w-[400px] max-h-[300px]" position="popper">
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="custom">+ Custom</SelectItem>
                    {holdingsOptions.byAccount.map(group => (
                      <SelectGroup key={group.accountName}>
                        <SelectLabel>{group.accountName}</SelectLabel>
                        {group.holdings.map(h => (
                          <SelectItem key={h.key} value={h.key}>{h.displayKey}</SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="symbol"
                  placeholder="MSFT"
                  value={formData.symbol}
                  onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="Microsoft Corporation"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="portfolio">Link to Portfolio</Label>
              <Select value={formData.portfolioId || "none"} onValueChange={(v) => setFormData({ ...formData, portfolioId: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Select portfolio (optional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {portfolios.map((p) => (
                    <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="shares">Shares *</Label>
                <Input
                  id="shares"
                  type="number"
                  step="any"
                  placeholder="100"
                  value={formData.shares}
                  onChange={(e) => setFormData({ ...formData, shares: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dividendPerShare">Dividend/Share *</Label>
                <Input
                  id="dividendPerShare"
                  type="number"
                  step="0.01"
                  placeholder="0.75"
                  value={formData.dividendPerShare}
                  onChange={(e) => setFormData({ ...formData, dividendPerShare: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="frequency">Frequency</Label>
                <Select value={formData.frequency} onValueChange={(v) => setFormData({ ...formData, frequency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FREQUENCY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentMonth">Primary Payment Month</Label>
                <Select value={formData.paymentMonth || "none"} onValueChange={(v) => setFormData({ ...formData, paymentMonth: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {MONTHS.map((m) => (
                      <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {formError && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm mt-4" role="alert">
                {formError}
              </div>
            )}
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => { setShowAddDialog(false); setFormError(null); }}>Cancel</Button>
              <Button onClick={handleSave} disabled={isSaving || !formData.symbol || !formData.shares || !formData.dividendPerShare}>
                {isSaving ? "Saving..." : editingDividend ? "Update" : "Add Dividend"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Dividend Entry</AlertDialogTitle>
          </AlertDialogHeader>
          <p className="text-muted-foreground">Are you sure you want to delete this dividend entry? This action cannot be undone.</p>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
