"use client"

import { TrendingUp, TrendingDown, Wallet, Building2, PieChart as PieChartIcon } from "lucide-react"

interface PortfolioHeaderProps {
  totalHoldingsValue: number
  totalHoldingsGain: number
  totalHoldingsGainPercent: number
  totalHoldingsCost: number
  totalLivePortfolios: number
  totalManualPortfolios: number
  portfolioCount: number
}

export function PortfolioHeader({
  totalHoldingsValue,
  totalHoldingsGain,
  totalHoldingsGainPercent,
  totalHoldingsCost,
  totalLivePortfolios,
  totalManualPortfolios,
  portfolioCount,
}: PortfolioHeaderProps) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-600/20">
          <Wallet className="w-7 h-7 text-white" />
        </div>
        <div>
          <div className="text-sm font-medium text-muted-foreground mb-1">Total Holdings Value</div>
          <div className="text-4xl font-bold tracking-tight">
            £{totalHoldingsValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </div>
          <div className="flex items-center gap-2 mt-1">
            {totalHoldingsGain >= 0 ? (
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-600" />
            )}
            <span className={`text-sm font-medium ${totalHoldingsGain >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {totalHoldingsGain >= 0 ? "+" : ""}£{totalHoldingsGain.toLocaleString("en-US", { minimumFractionDigits: 2 })} ({totalHoldingsGainPercent >= 0 ? "+" : ""}{totalHoldingsGainPercent.toFixed(1)}%)
            </span>
            <span className="text-sm text-muted-foreground">total gain</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1 lg:max-w-3xl">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border border-blue-200/50 dark:border-blue-800/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Live Portfolios</span>
          </div>
          <div className="text-2xl font-bold">{totalLivePortfolios}</div>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20 border border-amber-200/50 dark:border-amber-800/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Manual Portfolios</span>
          </div>
          <div className="text-2xl font-bold">{totalManualPortfolios}</div>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 border border-emerald-200/50 dark:border-emerald-800/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Total Cost</span>
          </div>
          <div className="text-2xl font-bold">£{totalHoldingsCost.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20 border border-purple-200/50 dark:border-purple-800/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <PieChartIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span className="text-xs font-medium text-purple-600 dark:text-purple-400">Portfolios</span>
          </div>
          <div className="text-2xl font-bold">{portfolioCount}</div>
        </div>
      </div>
    </div>
  )
}