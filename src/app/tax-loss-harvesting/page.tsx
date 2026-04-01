"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { TrendingDown, TrendingUp, AlertTriangle, Info, Search, ArrowRight, Leaf } from "lucide-react"
import { useQuery } from "convex/react"
import { AuthRequired } from "@/hooks/useRequireAuth"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { useCurrentUser } from "@/hooks/useCurrentUser"
import { getPriceInPounds } from "@/lib/utils"
import { CURRENT_TAX_YEAR } from "@/lib/constants"
import { Skeleton, SkeletonCard, SkeletonCardHeader, SkeletonCardContent, SkeletonText, SkeletonList } from "@/components/ui/skeleton"

interface HoldingWithLoss {
  symbol: string
  name: string
  accountName: string | undefined
  shares: number
  avgPrice: number
  currentPrice: number
  currency: string
  marketValue: number
  costBasis: number
  unrealizedLoss: number
  lossPercent: number
  potentialTaxSavings: number
  replacementSuggestions: string[]
}

const REPLACEMENT_SUGGESTIONS: Record<string, string[]> = {
  "VWRL": ["IWDA", "SPEM", "SWRD"],
  "VWRD": ["IWD", "SPY", "SCHF"],
  "VAGP": ["IAGG", "BNDX"],
  "FTSE": ["ISF", "IUKD"],
  "SPY": ["IVV", "VOO", "SPLG"],
  "IVV": ["SPY", "VOO", "SCHX"],
  "VOO": ["SPY", "IVV", "SCHX"],
  "QQQ": ["QQQM", "VGT", "XLK"],
  "GLD": ["IAU", "GLDM", "SGOL"],
  "BTC": ["IBIT", "ARKB", "FBTC"],
  "ETH": ["ETHE", "IBLKF", "QETH"],
  "MSFT": ["XLK", "VGT", "FTEC"],
  "AAPL": ["XLK", "VGT", "FTEC"],
  "GOOGL": ["XLC", "VOX", "FCOM"],
  "AMZN": ["XLY", "VCR", "FDIS"],
  "NVDA": ["SMH", "SOXX", "XSD"],
  "TSLA": ["XLY", "VCR", "FDIS"],
  "BRK.B": ["XLF", "VFH", "FNCL"],
  "JPM": ["XLF", "VFH", "FNCL"],
  "V": ["XLF", "VFH", "FNCL"],
}

function findReplacements(symbol: string): string[] {
  const upperSymbol = symbol.toUpperCase()
  return REPLACEMENT_SUGGESTIONS[upperSymbol] || ["Similar ETF in same sector"]
}

export default function TaxLossHarvestingPage() {
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
      taxYear: CURRENT_TAX_YEAR,
      userId: user._id as Id<"users">,
      incomeType: incomeType,
    } : "skip"
  )

  const [minLossFilter, setMinLossFilter] = useState<string>("0")
  const [accountFilter, setAccountFilter] = useState<string>("all")

  const holdingsWithLosses = useMemo((): HoldingWithLoss[] => {
    if (!getPortfolioData || !Array.isArray(getPortfolioData)) return []
    
    const cgt = taxInfo?.capitalGainsTax?.[0]
    const annualExempt = cgt?.annualExemptAmount ?? 3000
    const basicRate = cgt?.basicRatePercent ?? 10
    const higherRate = cgt?.higherRatePercent ?? 20
    const basicBandEnd = taxInfo?.bands?.[0]?.bandEndAmount ?? 37700

    const allHoldings = getPortfolioData.flatMap(p => p.holdings || [])
    
    return allHoldings
      .map(holding => {
        const currency = holding.currency || "GBP"
        const marketValue = getPriceInPounds(holding.shares * holding.currentPrice, currency)
        const costBasis = getPriceInPounds(holding.shares * holding.avgPrice, currency)
        const unrealizedLoss = marketValue - costBasis
        const lossPercent = costBasis > 0 ? (unrealizedLoss / costBasis) * 100 : 0

        const taxableGain = Math.max(0, -unrealizedLoss - annualExempt)
        const taxRate = (basicBandEnd > 0) ? basicRate / 100 : higherRate / 100
        const potentialTaxSavings = Math.min(taxableGain * taxRate, -unrealizedLoss * (higherRate / 100))

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
          unrealizedLoss,
          lossPercent,
          potentialTaxSavings: Math.max(0, potentialTaxSavings),
          replacementSuggestions: findReplacements(holding.symbol),
        }
      })
      .filter(h => h.unrealizedLoss < 0)
      .sort((a, b) => a.unrealizedLoss - b.unrealizedLoss)
  }, [getPortfolioData, taxInfo])

  const filteredHoldings = useMemo(() => {
    const minLoss = parseFloat(minLossFilter) || 0
    return holdingsWithLosses.filter(h => {
      if (h.unrealizedLoss > -minLoss) return false
      if (accountFilter !== "all" && h.accountName !== accountFilter) return false
      return true
    })
  }, [holdingsWithLosses, minLossFilter, accountFilter])

  const totalUnrealizedLoss = filteredHoldings.reduce((sum, h) => sum + h.unrealizedLoss, 0)
  const totalPotentialTaxSavings = filteredHoldings.reduce((sum, h) => sum + h.potentialTaxSavings, 0)
  const totalMarketValue = filteredHoldings.reduce((sum, h) => sum + h.marketValue, 0)

  const uniqueAccounts = useMemo(() => {
    const accounts = new Set<string>()
    holdingsWithLosses.forEach(h => {
      if (h.accountName) accounts.add(h.accountName)
    })
    return Array.from(accounts).sort()
  }, [holdingsWithLosses])

  if (!getPortfolioData) {
    return (
      <div className="flex min-h-screen bg-background">
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-background pr-4">
          <div className="p-4 lg:p-8 space-y-6">
            <div className="flex items-center gap-4">
              <Skeleton className="w-14 h-14 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-8 w-64" />
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonCard key={i} className="h-[80px] p-4" />
              ))}
            </div>

            <SkeletonCard className="h-[500px] p-6">
              <SkeletonCardHeader className="pb-2">
                <SkeletonText lines={2} />
              </SkeletonCardHeader>
              <SkeletonCardContent>
                <SkeletonList count={6} />
              </SkeletonCardContent>
            </SkeletonCard>
          </div>
        </main>
      </div>
    );
  }

  return (
    <AuthRequired>
    <div className="flex min-h-screen bg-background">
      <main className="flex-1 overflow-y-auto overflow-x-hidden bg-background pr-4">
        <div className="p-4 lg:p-8 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-red-500/20">
                <Leaf className="w-7 h-7 text-white" />
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Tax-Loss Harvesting</div>
                <div className="text-3xl font-bold tracking-tight">
                  Loss Scanner
                </div>
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                  <TrendingDown className="w-4 h-4" />
                  Find opportunities to offset capital gains
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1 lg:max-w-3xl lg:justify-end">
              <div className="bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/30 dark:to-red-900/20 border border-red-200/50 dark:border-red-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                  <span className="text-xs font-medium text-red-600 dark:text-red-400">Unrealized Losses</span>
                </div>
                <div className="text-2xl font-bold">£{Math.abs(totalUnrealizedLoss).toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
              </div>
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 border border-emerald-200/50 dark:border-emerald-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Potential Tax Savings</span>
                </div>
                <div className="text-2xl font-bold text-emerald-600">£{totalPotentialTaxSavings.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border border-blue-200/50 dark:border-blue-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Search className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Loss Positions</span>
                </div>
                <div className="text-2xl font-bold">{filteredHoldings.length}</div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20 border border-purple-200/50 dark:border-purple-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Info className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-xs font-medium text-purple-600 dark:text-purple-400">Positions Value</span>
                </div>
                <div className="text-2xl font-bold">£{totalMarketValue.toLocaleString("en-US", { minimumFractionDigits: 0 })}</div>
              </div>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Filter Opportunities
              </CardTitle>
              <CardDescription>Filter holdings by minimum loss amount and account type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Minimum Loss</label>
                  <Select value={minLossFilter} onValueChange={setMinLossFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select minimum loss" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Any loss</SelectItem>
                      <SelectItem value="100">At least £100</SelectItem>
                      <SelectItem value="500">At least £500</SelectItem>
                      <SelectItem value="1000">At least £1,000</SelectItem>
                      <SelectItem value="5000">At least £5,000</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Account</label>
                  <Select value={accountFilter} onValueChange={setAccountFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All accounts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All accounts</SelectItem>
                      {uniqueAccounts.map(account => (
                        <SelectItem key={account} value={account}>{account}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tax Year</label>
                  <div className="h-10 flex items-center px-3 bg-muted/50 rounded-md">
                    <span className="text-sm text-muted-foreground">2025/26</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {filteredHoldings.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Leaf className="w-7 h-7 text-muted-foreground" />
                </div>
                <p className="text-lg font-semibold mb-2">
                  {holdingsWithLosses.length === 0 ? "No loss positions found" : "No positions match your filters"}
                </p>
                <p className="text-muted-foreground text-center max-w-md">
                  {holdingsWithLosses.length === 0 
                    ? "All your holdings are currently in profit. Check back when market conditions change."
                    : "Try adjusting your filter criteria to see more opportunities."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Harvesting Opportunities</h2>
                <Badge variant="secondary">
                  {filteredHoldings.length} position{filteredHoldings.length !== 1 ? "s" : ""}
                </Badge>
              </div>

              {filteredHoldings.map((holding, index) => (
                <Card key={`${holding.symbol}-${index}`} className="overflow-hidden">
                  <div className="flex flex-col lg:flex-row">
                    <div className="flex-1 p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-bold">{holding.symbol}</span>
                            {holding.accountName && (
                              <Badge variant="outline" className="text-xs">
                                {holding.accountName}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{holding.name}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-red-600">
                            -£{Math.abs(holding.unrealizedLoss).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </div>
                          <div className="text-sm text-red-500">
                            ({holding.lossPercent.toFixed(1)}%)
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs">Shares</p>
                          <p className="font-medium">{holding.shares.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Avg. Cost</p>
                          <p className="font-medium">£{holding.avgPrice.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Current Price</p>
                          <p className="font-medium">£{holding.currentPrice.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Market Value</p>
                          <p className="font-medium">£{holding.marketValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
                        </div>
                      </div>
                    </div>

                    <Separator className="lg:my-auto lg:mx-0" orientation="vertical" />

                    <div className="lg:w-[280px] p-5 bg-muted/30">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-emerald-600">
                          <TrendingUp className="w-4 h-4" />
                          <span className="text-sm font-medium">Potential Tax Savings</span>
                        </div>
                        <div className="text-3xl font-bold text-emerald-600">
                          £{holding.potentialTaxSavings.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Based on {taxInfo?.capitalGainsTax?.[0]?.basicRatePercent ?? 10}% CGT rate
                        </p>

                        <Separator />

                        <div>
                          <p className="text-sm font-medium mb-2 flex items-center gap-2">
                            <ArrowRight className="w-4 h-4" />
                            Replacement Suggestions
                          </p>
                          <p className="text-xs text-muted-foreground mb-2">
                            To maintain market exposure after selling:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {holding.replacementSuggestions.map((replacement, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {replacement}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">How Tax-Loss Harvesting Works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                <strong>1. Sell losing positions:</strong> Selling holdings at a loss creates a capital loss that can offset capital gains.
              </p>
              <p>
                <strong>2. Offset gains:</strong> Use losses to reduce your capital gains tax liability. Annual exempt amount of £{taxInfo?.capitalGainsTax?.[0]?.annualExemptAmount ?? 3000} per year.
              </p>
              <p>
                <strong>3. Maintain exposure:</strong> Replace with similar (but not identical) investments to maintain your market exposure while harvesting the loss.
              </p>
              <p className="text-orange-600 dark:text-orange-400">
                <strong>Warning:</strong> Beware of the wash-sale rule - don&apos;t buy a &quot;substantially identical&quot; investment within 30 days before or after the sale.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
    </AuthRequired>
  )
}
