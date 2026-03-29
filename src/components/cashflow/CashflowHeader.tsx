"use client"

import { TrendingUp, PoundSterling, Calendar, Building2 } from "lucide-react"

interface SummaryMetrics {
  totalTakeHome: number
  totalTax: number
  yearsUntilDepleted: number
  finalTotalValue: number
}

interface CashflowHeaderProps {
  totalPortfolio: number
  startAge: number
  summary: SummaryMetrics
}

export function CashflowHeader({ totalPortfolio, startAge, summary }: CashflowHeaderProps) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-600/20">
          <TrendingUp className="w-7 h-7 text-white" />
        </div>
        <div>
          <div className="text-sm font-medium text-muted-foreground mb-1">Retirement Cashflow</div>
          <div className="text-4xl font-bold tracking-tight">
            £{totalPortfolio.toLocaleString("en-US", { minimumFractionDigits: 0 })}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            Starting at age {startAge}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1 lg:max-w-3xl">
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 border border-emerald-200/50 dark:border-emerald-800/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <PoundSterling className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Total Take Home</span>
          </div>
          <div className="text-2xl font-bold">£{(summary.totalTakeHome / 1000).toFixed(0)}k</div>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/30 dark:to-red-900/20 border border-red-200/50 dark:border-red-800/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <PoundSterling className="w-4 h-4 text-red-600 dark:text-red-400" />
            <span className="text-xs font-medium text-red-600 dark:text-red-400">Total Tax</span>
          </div>
          <div className="text-2xl font-bold">£{(summary.totalTax / 1000).toFixed(0)}k</div>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border border-blue-200/50 dark:border-blue-800/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Money Lasts</span>
          </div>
          <div className="text-2xl font-bold">
            {summary.yearsUntilDepleted > 100 - startAge ? "Forever" : `${summary.yearsUntilDepleted} yrs`}
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20 border border-purple-200/50 dark:border-purple-800/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span className="text-xs font-medium text-purple-600 dark:text-purple-400">At Age 100</span>
          </div>
          <div className="text-2xl font-bold">
            {summary.finalTotalValue > 0 ? `£${(summary.finalTotalValue / 1000000).toFixed(1)}M` : "£0"}
          </div>
        </div>
      </div>
    </div>
  )
}