"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { 
  TrendingUp, TrendingDown, Info, AlertCircle, ArrowRight, 
  ArrowDownToLine, ArrowUpFromLine, Building2, PiggyBank,
  CheckCircle2, AlertTriangle, Clock, Sparkles, Calendar,
  ChevronRight
} from "lucide-react"
import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { useCurrentUser } from "@/hooks/useCurrentUser"
import { getPriceInPounds } from "@/lib/utils"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

interface SelectedHolding {
  symbol: string
  name: string
  accountName: string | undefined
  shares: number
  avgPrice: number
  currentPrice: number
  currency: string
  marketValue: number
  costBasis: number
  unrealizedGain: number
  gainPercent: number
}

interface HoldingData {
  symbol: string
  name: string
  accountName: string | undefined
  shares: number
  avgPrice: number
  currentPrice: number
  currency: string
}



interface TaxInfo {
  capitalGainsTax?: Array<{
    annualExemptAmount: number
    basicRatePercent: number
    higherRatePercent: number
  }>
  bands?: Array<{
    bandName: string
    bandEndAmount: number
  }>
  personalAllowance?: {
    amount: number
  }
}

const ISA_ALLOWANCE_2025_26 = 20000

export default function BedAndISAPage() {
  const user = useCurrentUser()
  
  const getPortfolioData = useQuery(
    api.portfolio.getUserPortfolio.getUserPortfolio,
    user ? {} : "skip"
  )

  const userSettings = useQuery(
    api.tax.userSettings.getUserSettings,
    user ? { userId: user._id as Id<"users"> } : "skip"
  )

  const isRetired = userSettings?.isRetired ?? false
  const incomeType = isRetired ? "Pension" : "Employment"

  const taxInfo = useQuery(
    api.tax.runTaxQuery.getTaxInfoForIncome,
    user ? {
      taxYear: 2025,
      userId: user._id as Id<"users">,
      incomeType: incomeType,
    } : "skip"
  ) as TaxInfo | undefined

  const [selectedHoldingKey, setSelectedHoldingKey] = useState<string>("")
  const [sharesToTransfer, setSharesToTransfer] = useState<number>(0)
  const [targetISA, setTargetISA] = useState<string>("ISA")
  const [includeLossHarvesting, setIncludeLossHarvesting] = useState<boolean>(false)
  const [harvestedLossAmount, setHarvestedLossAmount] = useState<number>(0)
  const [smartTransferStrategy, setSmartTransferStrategy] = useState<"optimal" | "minimize-cgt" | "timeline">("optimal")

  const { taxableHoldings, uniqueISAAccounts } = useMemo(() => {
    if (!getPortfolioData || !Array.isArray(getPortfolioData)) {
      return { taxableHoldings: [] as HoldingData[], uniqueISAAccounts: [] as string[] }
    }

    const allHoldings = getPortfolioData.flatMap(p => p.holdings || [])
    
    const isISA = (accountName: string | undefined) => {
      if (!accountName) return false
      const lower = accountName.toLowerCase()
      return lower.includes("isa") || lower.includes("individual savings")
    }

    const taxable = allHoldings.filter(h => !isISA(h.accountName))
    const isa = allHoldings.filter(h => isISA(h.accountName))

    const isaAccounts = [...new Set(isa.map(h => h.accountName).filter((a): a is string => !!a))]

    return {
      taxableHoldings: taxable,
      uniqueISAAccounts: isaAccounts
    }
  }, [getPortfolioData])

  const selectedHolding: SelectedHolding | null = useMemo(() => {
    if (!selectedHoldingKey || !taxableHoldings.length) return null
    
    const [symbol, accountName] = selectedHoldingKey.split("::")
    const holding = taxableHoldings.find(h => h.symbol === symbol && h.accountName === accountName)
    
    if (!holding) return null

    const currency = holding.currency || "GBP"
    const marketValue = getPriceInPounds(holding.shares * holding.currentPrice, currency)
    const costBasis = getPriceInPounds(holding.shares * holding.avgPrice, currency)
    const unrealizedGain = marketValue - costBasis
    const gainPercent = costBasis > 0 ? (unrealizedGain / costBasis) * 100 : 0

    return {
      symbol: holding.symbol,
      name: holding.name,
      accountName: holding.accountName,
      shares: holding.shares,
      avgPrice: holding.avgPrice,
      currentPrice: holding.currentPrice,
      currency,
      marketValue,
      costBasis,
      unrealizedGain,
      gainPercent
    }
  }, [selectedHoldingKey, taxableHoldings])

  const transferCalculation = useMemo(() => {
    if (!selectedHolding || sharesToTransfer <= 0) {
      return null
    }

    const proportion = sharesToTransfer / selectedHolding.shares
    const transferValue = selectedHolding.marketValue * proportion
    const transferCostBasis = selectedHolding.costBasis * proportion
    const unrealizedGainLoss = transferValue - transferCostBasis
    const isGain = unrealizedGainLoss > 0
    const isLoss = unrealizedGainLoss < 0

    const cgt = taxInfo?.capitalGainsTax?.[0]
    const annualExempt = cgt?.annualExemptAmount ?? 3000
    const basicRate = cgt?.basicRatePercent ?? 10
    const higherRate = cgt?.higherRatePercent ?? 20
    const basicBandEnd = taxInfo?.bands?.[0]?.bandEndAmount ?? 37700

    let cgtLiability = 0
    let taxableGain = 0
    let effectiveRate = 0

    if (isGain) {
      const adjustedGain = unrealizedGainLoss - harvestedLossAmount
      const afterExemptGain = Math.max(0, adjustedGain - annualExempt)
      taxableGain = afterExemptGain

      if (taxableGain > 0) {
        const remainingBasicBand = Math.max(0, basicBandEnd)
        const basicRateAmount = Math.min(taxableGain, remainingBasicBand)
        const higherRateAmount = Math.max(0, taxableGain - remainingBasicBand)

        const basicTax = basicRateAmount * (basicRate / 100)
        const higherTax = higherRateAmount * (higherRate / 100)
        cgtLiability = basicTax + higherTax
        effectiveRate = taxableGain > 0 ? (cgtLiability / taxableGain) * 100 : 0
      }
    }

    const netProceeds = transferValue - cgtLiability
    const isaAllowanceUsed = Math.min(netProceeds, ISA_ALLOWANCE_2025_26)
    const remainingAllowance = ISA_ALLOWANCE_2025_26 - isaAllowanceUsed
    const allowanceExceeded = netProceeds > ISA_ALLOWANCE_2025_26

    return {
      transferValue,
      transferCostBasis,
      unrealizedGainLoss,
      isGain,
      isLoss,
      cgtLiability,
      taxableGain,
      effectiveRate,
      netProceeds,
      isaAllowanceUsed,
      remainingAllowance,
      allowanceExceeded,
      annualExempt,
      proportion
    }
  }, [selectedHolding, sharesToTransfer, harvestedLossAmount, taxInfo])

  const smartTransferCalculation = useMemo(() => {
    if (!selectedHolding || !taxInfo?.capitalGainsTax?.[0]) return null

    const cgt = taxInfo.capitalGainsTax[0]
    const annualExempt = cgt.annualExemptAmount ?? 3000
    const higherRate = cgt.higherRatePercent ?? 20
    const currentPrice = selectedHolding.currentPrice
    const avgPrice = selectedHolding.avgPrice

    const calculateSharesForValue = (targetValue: number): number => {
      if (currentPrice <= 0) return 0
      return Math.floor((targetValue / currentPrice) * 100) / 100
    }

    const calculateTaxForShares = (shares: number): { cgt: number; taxableGain: number } => {
      const value = shares * currentPrice
      const costBasis = shares * avgPrice
      const gain = value - costBasis
      
      if (gain <= 0) return { cgt: 0, taxableGain: 0 }
      
      const adjustedGain = gain - harvestedLossAmount
      const taxableGain = Math.max(0, adjustedGain - annualExempt)
      const cgtLiability = taxableGain > 0 ? taxableGain * (higherRate / 100) : 0
      
      return { cgt: cgtLiability, taxableGain }
    }

    const optimalShares = calculateSharesForValue(ISA_ALLOWANCE_2025_26)
    const { cgt: optimalCgt, taxableGain: optimalTaxableGain } = calculateTaxForShares(optimalShares)
    const optimalTransferValue = optimalShares * currentPrice
    const optimalRemainingAllowance = Math.max(0, ISA_ALLOWANCE_2025_26 - optimalTransferValue)

    const totalValue = selectedHolding.marketValue
    const yearsNeeded = Math.ceil(totalValue / ISA_ALLOWANCE_2025_26)
    const multiYearPlan: Array<{
      year: number
      taxYear: string
      shares: number
      value: number
      costBasis: number
      gain: number
      cgt: number
      exemptUsed: number
      allowanceUsed: number
      cumulativeCgt: number
    }> = []

    let remainingShares = selectedHolding.shares
    let cumulativeCgt = 0
    const currentYear = new Date().getFullYear()

    for (let i = 0; i < Math.min(yearsNeeded, 10) && remainingShares > 0; i++) {
      const yearAllowance = ISA_ALLOWANCE_2025_26
      const sharesThisYear = Math.min(remainingShares, calculateSharesForValue(yearAllowance))
      const valueThisYear = sharesThisYear * currentPrice
      const costBasisThisYear = sharesThisYear * avgPrice
      const gainThisYear = valueThisYear - costBasisThisYear
      
      let cgtThisYear = 0
      let exemptUsed = 0
      
      if (gainThisYear > 0) {
        exemptUsed = Math.min(gainThisYear, annualExempt)
        const taxableGainThisYear = Math.max(0, gainThisYear - exemptUsed)
        cgtThisYear = taxableGainThisYear > 0 ? taxableGainThisYear * (higherRate / 100) : 0
      }
      
      cumulativeCgt += cgtThisYear
      
      multiYearPlan.push({
        year: currentYear + i,
        taxYear: `${(currentYear + i).toString().slice(-2)}/${(currentYear + i + 1).toString().slice(-2)}`,
        shares: sharesThisYear,
        value: valueThisYear,
        costBasis: costBasisThisYear,
        gain: gainThisYear,
        cgt: cgtThisYear,
        exemptUsed,
        allowanceUsed: Math.min(valueThisYear, yearAllowance),
        cumulativeCgt
      })
      
      remainingShares -= sharesThisYear
    }

    const totalCgtIfAllNow = (() => {
      if (totalValue <= selectedHolding.costBasis) return 0
      const totalGain = totalValue - selectedHolding.costBasis
      const taxableGain = Math.max(0, totalGain - annualExempt)
      return taxableGain > 0 ? taxableGain * (higherRate / 100) : 0
    })()

    const savingsFromSplit = totalCgtIfAllNow - cumulativeCgt

    return {
      optimalShares: Math.min(optimalShares, selectedHolding.shares),
      optimalTransferValue,
      optimalCgt,
      optimalTaxableGain,
      optimalRemainingAllowance,
      totalHoldingValue: totalValue,
      totalHoldingShares: selectedHolding.shares,
      yearsNeeded,
      multiYearPlan,
      totalCgtIfAllNow,
      cumulativeCgt,
      savingsFromSplit,
      annualExempt
    }
  }, [selectedHolding, taxInfo, harvestedLossAmount])

  if (!getPortfolioData) {
    return <LoadingSpinner fullScreen message="Loading holdings..." />
  }

  return (
    <div className="flex min-h-screen bg-background">
      <main className="flex-1 overflow-y-auto overflow-x-hidden bg-background pr-4">
        <div className="p-4 lg:p-8 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
                <ArrowRight className="w-7 h-7 text-white" />
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Tax Planning</div>
                <div className="text-3xl font-bold tracking-tight">
                  Bed-and-ISA
                </div>
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                  <ArrowDownToLine className="w-4 h-4" />
                  Transfer taxable holdings to ISA
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1 lg:max-w-3xl lg:justify-end">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border border-blue-200/50 dark:border-blue-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <PiggyBank className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400">2025/26 Allowance</span>
                </div>
                <div className="text-2xl font-bold">£{ISA_ALLOWANCE_2025_26.toLocaleString()}</div>
              </div>
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 border border-emerald-200/50 dark:border-emerald-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Used This Year</span>
                </div>
                <div className="text-2xl font-bold">
                  £{(transferCalculation?.isaAllowanceUsed ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20 border border-amber-200/50 dark:border-amber-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Remaining</span>
                </div>
                <div className="text-2xl font-bold text-amber-600">
                  £{(transferCalculation?.remainingAllowance ?? ISA_ALLOWANCE_2025_26).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20 border border-purple-200/50 dark:border-purple-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <ArrowUpFromLine className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-xs font-medium text-purple-600 dark:text-purple-400">2026/27 Allowance</span>
                </div>
                <div className="text-2xl font-bold">£{ISA_ALLOWANCE_2025_26.toLocaleString()}</div>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ArrowDownToLine className="h-5 w-5 text-emerald-600" />
                    Select Holding to Transfer
                  </CardTitle>
                  <CardDescription>
                    Choose a holding from your taxable account (GIA) to transfer to ISA
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Select Holding</Label>
                    <Select value={selectedHoldingKey} onValueChange={(value) => {
                      setSelectedHoldingKey(value)
                      setSharesToTransfer(0)
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a holding from taxable account" />
                      </SelectTrigger>
                      <SelectContent>
                        {taxableHoldings.length === 0 ? (
                          <SelectItem value="none" disabled>No taxable holdings found</SelectItem>
                        ) : (
                          taxableHoldings.map((holding) => {
                            const currency = holding.currency || "GBP"
                            const marketValue = getPriceInPounds(holding.shares * holding.currentPrice, currency)
                            const costBasis = getPriceInPounds(holding.shares * holding.avgPrice, currency)
                            const gain = marketValue - costBasis
                            return (
                              <SelectItem 
                                key={`${holding.symbol}::${holding.accountName}`} 
                                value={`${holding.symbol}::${holding.accountName}`}
                              >
                                {holding.symbol} - {holding.accountName || 'Unknown'} (£{marketValue.toLocaleString(undefined, { maximumFractionDigits: 0 })})
                                {gain > 0 ? ` ↑` : gain < 0 ? ` ↓` : ''}
                              </SelectItem>
                            )
                          })
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedHolding && (
                    <>
                      <div className="grid md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                        <div>
                          <p className="text-xs text-muted-foreground">Symbol</p>
                          <p className="font-semibold">{selectedHolding.symbol}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Account</p>
                          <p className="font-semibold">{selectedHolding.accountName || 'Unknown'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Shares Available</p>
                          <p className="font-semibold">{selectedHolding.shares.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Current Price</p>
                          <p className="font-semibold">£{selectedHolding.currentPrice.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Cost Basis</p>
                          <p className="font-semibold">£{selectedHolding.costBasis.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Market Value</p>
                          <p className="font-semibold">£{selectedHolding.marketValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="shares">Shares to Transfer</Label>
                        <div className="flex gap-2">
                          <Input
                            id="shares"
                            type="number"
                            value={sharesToTransfer || ""}
                            placeholder="Enter number of shares"
                            className="h-10"
                            max={selectedHolding.shares}
                            min={0}
                            onChange={(e) => {
                              const value = e.target.value
                              const numValue = Number(value)
                              if (value === "") {
                                setSharesToTransfer(0)
                              } else if (numValue >= 0 && numValue <= selectedHolding.shares) {
                                setSharesToTransfer(numValue)
                              }
                            }}
                          />
                          <Button 
                            variant="outline"
                            onClick={() => setSharesToTransfer(selectedHolding.shares)}
                          >
                            All
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Maximum: {selectedHolding.shares.toLocaleString()} shares (£{selectedHolding.marketValue.toLocaleString(undefined, { maximumFractionDigits: 0 })})
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>Target ISA Account</Label>
                        <Select value={targetISA} onValueChange={setTargetISA}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {uniqueISAAccounts.length > 0 ? (
                              uniqueISAAccounts.map((account) => (
                                <SelectItem key={account} value={account}>{account}</SelectItem>
                              ))
                            ) : (
                              <SelectItem value="ISA">S&S ISA</SelectItem>
                            )}
                            <SelectItem value="New ISA">+ Create New ISA</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {transferCalculation && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-blue-600" />
                      Tax Impact Analysis
                    </CardTitle>
                    <CardDescription>
                      Compare keeping in taxable vs. Bed-and-ISA transfer
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="comparison" className="w-full">
                      <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="comparison">Comparison</TabsTrigger>
                        <TabsTrigger value="details">Tax Details</TabsTrigger>
                        <TabsTrigger value="future">Future Tax</TabsTrigger>
                        <TabsTrigger value="smart">
                          <Sparkles className="w-3.5 h-3.5 mr-1" />
                          Smart Transfer
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="comparison" className="space-y-6 mt-6">
                        <div className="grid md:grid-cols-2 gap-6">
                          <div className="p-5 rounded-xl border bg-muted/30">
                            <h3 className="font-semibold mb-4 flex items-center gap-2">
                              <Building2 className="w-4 h-4" />
                              Keep in Taxable (GIA)
                            </h3>
                            <div className="space-y-3">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Current Value:</span>
                                <span className="font-medium">£{transferCalculation.transferValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Cost Basis:</span>
                                <span className="font-medium">£{transferCalculation.transferCostBasis.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                              </div>
                              <Separator />
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Unrealized Gain/Loss:</span>
                                <span className={`font-medium ${transferCalculation.isGain ? 'text-emerald-600' : 'text-red-600'}`}>
                                  {transferCalculation.isGain ? '+' : ''}£{transferCalculation.unrealizedGainLoss.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                </span>
                              </div>
                              <Separator />
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Future Dividends:</span>
                                <span className="font-medium">Taxed at income rate</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Future Gains:</span>
                                <span className="font-medium">CGT applies</span>
                              </div>
                            </div>
                          </div>

                          <div className="p-5 rounded-xl border-2 border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20">
                            <h3 className="font-semibold mb-4 flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                              <PiggyBank className="w-4 h-4" />
                              Bed-and-ISA Transfer
                            </h3>
                            <div className="space-y-3">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Transfer Value:</span>
                                <span className="font-medium">£{transferCalculation.transferValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">CGT Liability:</span>
                                <span className="font-medium text-destructive">
                                  -£{transferCalculation.cgtLiability.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                </span>
                              </div>
                              <Separator />
                              <div className="flex justify-between font-semibold">
                                <span>Net Proceeds:</span>
                                <span>£{transferCalculation.netProceeds.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                              </div>
                              <Separator />
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">ISA Allowance Used:</span>
                                <span className="font-medium">£{transferCalculation.isaAllowanceUsed.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Cost Basis in ISA:</span>
                                <span className="font-medium">£{transferCalculation.transferCostBasis.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {transferCalculation.isGain && (
                          <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                            <div className="flex items-start gap-3">
                              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                              <div>
                                <p className="font-medium text-amber-800 dark:text-amber-200">Taxable Gain Detected</p>
                                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                                  This transfer will trigger a capital gains tax liability of £{transferCalculation.cgtLiability.toLocaleString(undefined, { maximumFractionDigits: 2 })}.
                                  Consider waiting if the holding is at a loss.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {transferCalculation.allowanceExceeded && (
                          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                            <div className="flex items-start gap-3">
                              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                              <div>
                                <p className="font-medium text-red-800 dark:text-red-200">ISA Allowance Exceeded</p>
                                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                                  The net proceeds (£{transferCalculation.netProceeds.toLocaleString(undefined, { maximumFractionDigits: 0 })}) 
                                  exceed the annual ISA allowance (£{ISA_ALLOWANCE_2025_26.toLocaleString()}). 
                                  Consider spreading the transfer across multiple tax years.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="details" className="mt-6">
                        <div className="space-y-6">
                          <div className="p-4 rounded-lg border">
                            <h3 className="font-semibold mb-4">Capital Gains Tax Calculation</h3>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Unrealized Gain/Loss:</span>
                                <span className={transferCalculation.isGain ? 'text-emerald-600' : 'text-red-600'}>
                                  {transferCalculation.isGain ? '+' : ''}£{transferCalculation.unrealizedGainLoss.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                </span>
                              </div>
                              
                              {harvestedLossAmount > 0 && (
                                <div className="flex justify-between text-emerald-600">
                                  <span>Less: Harvested Loss:</span>
                                  <span>-£{harvestedLossAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                                </div>
                              )}

                              <div className="flex justify-between font-medium">
                                <span>Adjusted Gain:</span>
                                <span>£{(transferCalculation.unrealizedGainLoss - harvestedLossAmount).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                              </div>
                              
                              <Separator />
                              
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Less Annual Exempt:</span>
                                <span>-£{transferCalculation.annualExempt.toLocaleString()}</span>
                              </div>
                              
                              <div className="flex justify-between font-medium">
                                <span>Taxable Gain:</span>
                                <span>£{transferCalculation.taxableGain.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                              </div>

                              {transferCalculation.taxableGain > 0 && (
                                <>
                                  <Separator />
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">CGT Rate:</span>
                                    <span>{transferCalculation.effectiveRate.toFixed(1)}% effective</span>
                                  </div>
                                  <div className="flex justify-between font-semibold">
                                    <span>CGT Liability:</span>
                                    <span className="text-destructive">£{transferCalculation.cgtLiability.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                                  </div>
                                </>
                              )}

                              {transferCalculation.taxableGain <= 0 && (
                                <>
                                  <Separator />
                                  <div className="flex justify-between items-center text-emerald-600">
                                    <span>CGT Liability:</span>
                                    <span className="font-semibold">£0</span>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-2">
                                    The gain is either negative (a loss) or within the annual exempt amount.
                                  </p>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="p-4 rounded-lg border">
                            <h3 className="font-semibold mb-4">Annual Exempt Amount Usage</h3>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Annual Exempt (2025/26):</span>
                                <span>£{transferCalculation.annualExempt.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Gain Used:</span>
                                <span>£{Math.min(transferCalculation.unrealizedGainLoss, transferCalculation.annualExempt).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                              </div>
                              <div className="flex justify-between font-medium">
                                <span>Remaining Exempt:</span>
                                <span>£{Math.max(0, transferCalculation.annualExempt - transferCalculation.unrealizedGainLoss).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="future" className="mt-6">
                        <div className="space-y-6">
                          <div className="p-4 rounded-lg border">
                            <h3 className="font-semibold mb-4">Future Tax Treatment Comparison</h3>
                            <div className="space-y-4">
                              <div className="grid md:grid-cols-2 gap-4">
                                <div className="p-4 rounded-lg bg-muted/30">
                                  <h4 className="font-medium mb-3 flex items-center gap-2">
                                    <Building2 className="w-4 h-4" />
                                    Taxable Account (GIA)
                                  </h4>
                                  <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Dividends:</span>
                                      <span>Up to 39%</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Interest:</span>
                                      <span>Up to 45%</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Capital Gains:</span>
                                      <span>10% / 20% / 24%</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Annual Exempt:</span>
                                      <span>£{transferCalculation.annualExempt.toLocaleString()}/yr</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                                  <h4 className="font-medium mb-3 flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                                    <PiggyBank className="w-4 h-4" />
                                    ISA
                                  </h4>
                                  <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Dividends:</span>
                                      <span className="text-emerald-600 font-medium">0%</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Interest:</span>
                                      <span className="text-emerald-600 font-medium">0%</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Capital Gains:</span>
                                      <span className="text-emerald-600 font-medium">0%</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Annual Limit:</span>
                                      <span>£{ISA_ALLOWANCE_2025_26.toLocaleString()}/yr</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="p-4 rounded-lg border bg-blue-50 dark:bg-blue-950/30">
                            <h3 className="font-semibold mb-2 flex items-center gap-2">
                              <Info className="w-4 h-4 text-blue-600" />
                              Long-term Benefit
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              By moving assets into an ISA, all future growth (dividends, interest, capital gains) 
                              is completely tax-free. While you may pay CGT now, the tax-free growth in an ISA 
                              can outweigh the one-time CGT cost over time, especially for growth assets held long-term.
                            </p>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="smart" className="mt-6">
                        {smartTransferCalculation ? (
                          <div className="space-y-6">
                            <div className="flex gap-2 mb-4">
                              <Button
                                variant={smartTransferStrategy === "optimal" ? "default" : "outline"}
                                size="sm"
                                onClick={() => setSmartTransferStrategy("optimal")}
                                className="flex-1"
                              >
                                <Sparkles className="w-4 h-4 mr-1" />
                                Optimal
                              </Button>
                              <Button
                                variant={smartTransferStrategy === "minimize-cgt" ? "default" : "outline"}
                                size="sm"
                                onClick={() => setSmartTransferStrategy("minimize-cgt")}
                                className="flex-1"
                              >
                                <TrendingDown className="w-4 h-4 mr-1" />
                                Minimize CGT
                              </Button>
                              <Button
                                variant={smartTransferStrategy === "timeline" ? "default" : "outline"}
                                size="sm"
                                onClick={() => setSmartTransferStrategy("timeline")}
                                className="flex-1"
                              >
                                <Calendar className="w-4 h-4 mr-1" />
                                Timeline
                              </Button>
                            </div>

                            {smartTransferStrategy === "optimal" && (
                              <div className="space-y-4">
                                <div className="p-5 rounded-xl border-2 border-purple-500 bg-purple-50/50 dark:bg-purple-950/20">
                                  <h3 className="font-semibold mb-4 flex items-center gap-2 text-purple-700 dark:text-purple-300">
                                    <Sparkles className="w-5 h-5" />
                                    Optimal Transfer - Maximize ISA Allowance
                                  </h3>
                                  <div className="grid md:grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Optimal Shares:</span>
                                        <span className="font-bold text-purple-600">
                                          {smartTransferCalculation.optimalShares.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Transfer Value:</span>
                                        <span className="font-semibold">
                                          £{smartTransferCalculation.optimalTransferValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                        </span>
                                      </div>
                                      <Separator />
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">CGT Liability:</span>
                                        <span className="font-medium text-destructive">
                                          -£{smartTransferCalculation.optimalCgt.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                        </span>
                                      </div>
                                      <div className="flex justify-between font-semibold">
                                        <span>ISA Allowance Used:</span>
                                        <span className="text-purple-600">
                                          £{smartTransferCalculation.optimalTransferValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Allowance Remaining:</span>
                                        <span className="font-medium text-emerald-600">
                                          £{smartTransferCalculation.optimalRemainingAllowance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex flex-col justify-center">
                                      <Button
                                        onClick={() => {
                                          setSharesToTransfer(smartTransferCalculation.optimalShares)
                                        }}
                                        className="w-full"
                                      >
                                        Apply This Amount
                                        <ChevronRight className="w-4 h-4 ml-1" />
                                      </Button>
                                      <p className="text-xs text-muted-foreground text-center mt-2">
                                        Transfer this amount to use your full £{ISA_ALLOWANCE_2025_26.toLocaleString()} allowance
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                <div className="p-4 rounded-lg border bg-muted/30">
                                  <h4 className="font-medium mb-3">Quick Transfer Options</h4>
                                  <div className="grid grid-cols-3 gap-3">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        const quickAmount = Math.floor(smartTransferCalculation.optimalShares * 0.25 * 100) / 100
                                        setSharesToTransfer(quickAmount)
                                      }}
                                      className="text-xs"
                                    >
                                      25% ({Math.floor(smartTransferCalculation.optimalShares * 0.25).toLocaleString()} shares)
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        const quickAmount = Math.floor(smartTransferCalculation.optimalShares * 0.5 * 100) / 100
                                        setSharesToTransfer(quickAmount)
                                      }}
                                      className="text-xs"
                                    >
                                      50% ({Math.floor(smartTransferCalculation.optimalShares * 0.5).toLocaleString()} shares)
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        const quickAmount = Math.floor(smartTransferCalculation.optimalShares * 0.75 * 100) / 100
                                        setSharesToTransfer(quickAmount)
                                      }}
                                      className="text-xs"
                                    >
                                      75% ({Math.floor(smartTransferCalculation.optimalShares * 0.75).toLocaleString()} shares)
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            )}

                            {smartTransferStrategy === "minimize-cgt" && (
                              <div className="space-y-4">
                                <div className="p-4 rounded-lg border bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
                                  <h3 className="font-semibold mb-2 flex items-center gap-2 text-amber-700 dark:text-amber-300">
                                    <TrendingDown className="w-5 h-5" />
                                    Multi-Year Strategy to Minimize CGT
                                  </h3>
                                  <p className="text-sm text-muted-foreground mb-4">
                                    Spread transfers across multiple years to use the annual exempt amount each year.
                                  </p>
                                  
                                  {smartTransferCalculation.savingsFromSplit > 0 && (
                                    <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 mb-4">
                                      <div className="flex justify-between items-center">
                                        <span className="text-emerald-700 dark:text-emerald-300 font-medium">Potential CGT Savings:</span>
                                        <span className="font-bold text-emerald-600">
                                          £{smartTransferCalculation.savingsFromSplit.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                        </span>
                                      </div>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        By spreading transfers across {smartTransferCalculation.multiYearPlan.length} years vs. all at once
                                      </p>
                                    </div>
                                  )}

                                  <div className="space-y-2">
                                    {smartTransferCalculation.multiYearPlan.map((year, idx) => (
                                      <div key={year.year} className="flex items-center justify-between p-3 rounded-lg bg-background border">
                                        <div className="flex items-center gap-3">
                                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                            idx === 0 ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600' : 'bg-muted text-muted-foreground'
                                          }`}>
                                            {idx + 1}
                                          </div>
                                          <div>
                                            <p className="font-medium">{year.taxYear}</p>
                                            <p className="text-xs text-muted-foreground">{year.shares.toLocaleString()} shares</p>
                                          </div>
                                        </div>
                                        <div className="text-right">
                                          <p className="font-medium">£{year.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                                          {year.cgt > 0 ? (
                                            <p className="text-xs text-destructive">CGT: £{year.cgt.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                                          ) : (
                                            <p className="text-xs text-emerald-600">No CGT</p>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                <div className="p-4 rounded-lg border">
                                  <h4 className="font-medium mb-3">CGT Comparison</h4>
                                  <div className="grid md:grid-cols-2 gap-4">
                                    <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                                      <p className="text-sm font-medium text-red-700 dark:text-red-300 mb-1">Transfer All Now</p>
                                      <p className="text-2xl font-bold text-red-600">
                                        £{smartTransferCalculation.totalCgtIfAllNow.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                      </p>
                                      <p className="text-xs text-muted-foreground">One-time CGT hit</p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                                      <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300 mb-1">Split Over {smartTransferCalculation.multiYearPlan.length} Years</p>
                                      <p className="text-2xl font-bold text-emerald-600">
                                        £{smartTransferCalculation.cumulativeCgt.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                      </p>
                                      <p className="text-xs text-muted-foreground">Using annual exempt each year</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {smartTransferStrategy === "timeline" && (
                              <div className="space-y-4">
                                <div className="p-4 rounded-lg border">
                                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                                    <Calendar className="w-5 h-5" />
                                    Transfer Timeline
                                  </h3>
                                  
                                  <div className="relative">
                                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-muted" />
                                    
                                    <div className="space-y-6">
                                      {smartTransferCalculation.multiYearPlan.map((year, idx) => (
                                        <div key={year.year} className="relative flex gap-4">
                                          <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 ${
                                            idx === 0 ? 'bg-purple-500 text-white' : 'bg-muted text-muted-foreground'
                                          }`}>
                                            {idx === 0 ? <Clock className="w-4 h-4" /> : <span className="text-sm font-bold">{idx + 1}</span>}
                                          </div>
                                          <div className="flex-1 pb-6">
                                            <div className="flex items-center justify-between mb-2">
                                              <span className="font-semibold">{year.taxYear}</span>
                                              <span className={`text-sm ${year.cgt > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                                {year.cgt > 0 ? `CGT: £${year.cgt.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : 'No CGT'}
                                              </span>
                                            </div>
                                            <div className="p-3 rounded-lg bg-muted/30">
                                              <div className="grid grid-cols-2 gap-2 text-sm">
                                                <div>
                                                  <p className="text-muted-foreground text-xs">Shares</p>
                                                  <p className="font-medium">{year.shares.toLocaleString()}</p>
                                                </div>
                                                <div>
                                                  <p className="text-muted-foreground text-xs">Value</p>
                                                  <p className="font-medium">£{year.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                                                </div>
                                                <div>
                                                  <p className="text-muted-foreground text-xs">Gain</p>
                                                  <p className={`font-medium ${year.gain > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                    {year.gain > 0 ? '+' : ''}£{year.gain.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                  </p>
                                                </div>
                                                <div>
                                                  <p className="text-muted-foreground text-xs">Allowance Used</p>
                                                  <p className="font-medium">£{year.allowanceUsed.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                                                </div>
                                              </div>
                                            </div>
                                            {idx === 0 && (
                                              <p className="text-xs text-muted-foreground mt-2">
                                                Start here - use current year&apos;s allowance
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>

                                <div className="p-4 rounded-lg border bg-blue-50 dark:bg-blue-950/30">
                                  <h4 className="font-medium mb-2 flex items-center gap-2">
                                    <Info className="w-4 h-4 text-blue-600" />
                                    Timeline Tips
                                  </h4>
                                  <ul className="text-sm text-muted-foreground space-y-1">
                                    <li>• Start transfers early in the tax year to maximize time for subsequent transfers</li>
                                    <li>• Wait at least 1 day between selling in GIA and buying in ISA (wash sale rule)</li>
                                    <li>• Consider using limit orders to manage price risk during transfers</li>
                                    <li>• Review your progress each year and adjust remaining transfers as needed</li>
                                  </ul>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="p-8 text-center text-muted-foreground">
                            <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>Select a holding to see smart transfer recommendations</p>
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">How Bed-and-ISA Works</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-emerald-600">1</span>
                    </div>
                    <div>
                      <p className="font-medium text-sm">Sell in Taxable Account</p>
                      <p className="text-xs text-muted-foreground">
                        Sell the holding in your General Investment Account (GIA)
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Wait 1+ Day</p>
                      <p className="text-xs text-muted-foreground">
                        Wait at least 1 day to avoid wash sale rules
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-blue-600">3</span>
                    </div>
                    <div>
                      <p className="font-medium text-sm">Buy in ISA</p>
                      <p className="text-xs text-muted-foreground">
                        Buy the same or similar holding in your ISA
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2 text-amber-800 dark:text-amber-200">
                    <AlertTriangle className="w-4 h-4" />
                    Important Warnings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <p className="font-medium text-amber-800 dark:text-amber-200">Wash Sale Rule</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Don&apos;t buy the same or &quot;substantially identical&quot; investment within 30 days before or after the sale, or the loss may be disallowed.
                    </p>
                  </div>
                  <Separator className="bg-amber-200/50 dark:bg-amber-800/50" />
                  <div>
                    <p className="font-medium text-amber-800 dark:text-amber-200">Platform Fees</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Consider platform fees for both sell and buy transactions - they can eat into savings.
                    </p>
                  </div>
                  <Separator className="bg-amber-200/50 dark:bg-amber-800/50" />
                  <div>
                    <p className="font-medium text-amber-800 dark:text-amber-200">Timing Risk</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Market prices may move between selling and buying. Consider using limit orders.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {transferCalculation && transferCalculation.isGain && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingDown className="w-4 h-4" />
                      Offset with Losses
                    </CardTitle>
                    <CardDescription>
                      Use losses to reduce your CGT liability
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="includeLoss"
                        checked={includeLossHarvesting}
                        onChange={(e) => setIncludeLossHarvesting(e.target.checked)}
                        className="w-4 h-4"
                      />
                      <Label htmlFor="includeLoss" className="text-sm font-normal">
                        Apply harvested losses to reduce CGT
                      </Label>
                    </div>

                    {includeLossHarvesting && (
                      <div className="space-y-2">
                        <Label htmlFor="lossAmount">Loss Amount to Apply</Label>
                        <Input
                          id="lossAmount"
                          type="number"
                          value={harvestedLossAmount || ""}
                          placeholder="Enter loss amount"
                          className="h-10"
                          max={Math.abs(transferCalculation.unrealizedGainLoss)}
                          onChange={(e) => {
                            const value = e.target.value
                            setHarvestedLossAmount(Number(value) || 0)
                          }}
                        />
                        <p className="text-xs text-muted-foreground">
                          Max: £{Math.abs(transferCalculation.unrealizedGainLoss).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    )}

                    {harvestedLossAmount > 0 && (
                      <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-emerald-700 dark:text-emerald-300">CGT Savings:</span>
                          <span className="font-bold text-emerald-600">
                            £{Math.min(harvestedLossAmount * 0.2, transferCalculation.cgtLiability).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Ideal Candidates</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <p>Holdings with unrealized losses (no immediate CGT)</p>
                  </div>
                  <div className="flex gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <p>High-growth assets you plan to hold long-term</p>
                  </div>
                  <div className="flex gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <p>Assets generating regular dividends</p>
                  </div>
                  <div className="flex gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <p>When you have available ISA allowance</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
