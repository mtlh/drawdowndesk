"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Loader2, Check, LineChart as LineChartIcon } from "lucide-react"
import { Holding, SimpleHolding } from "@/types/portfolios"
import { EmptyHoldingsState, NoValueHoldingsState, AllocationChart } from "@/components/holdings"
import { PieChartTooltip } from "@/components/chart-tooltip"

interface PortfolioStats {
  totalValue: number
  totalCost: number
  totalGain: number
  totalGainPercent: number
}

interface AllocationData {
  name: string
  value: number
}

interface PortfolioCardProps {
  id: string
  name: string
  portfolioType?: "live" | "manual"
  stats: PortfolioStats
  holdings: Holding[]
  simpleHoldings: SimpleHolding[]
  allocationData: AllocationData[]
  onNameChange: (name: string) => void
  onPerformanceClick: () => void
  savingPortfolioId: string | null
  renamedPortfolioId: string | null
}

export function PortfolioCard({
  id,
  name,
  portfolioType,
  stats,
  holdings,
  simpleHoldings,
  allocationData,
  onNameChange,
  onPerformanceClick,
  savingPortfolioId,
  renamedPortfolioId,
}: PortfolioCardProps) {
  const isManual = portfolioType === "manual"
  const isSaving = savingPortfolioId === id
  const wasRenamed = renamedPortfolioId === id

  const PieTooltip = PieChartTooltip({})

  return (
    <Card className="flex flex-col hover:shadow-lg transition-all duration-200 !border-0 overflow-hidden gap-0 py-0">
      <div className={`px-4 py-3 rounded-t-xl -mt-0 ${isManual
        ? "bg-gradient-to-r from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20"
        : "bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20"
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
              isManual
                ? "bg-amber-200 text-amber-700 dark:bg-amber-800/50 dark:text-amber-300"
                : "bg-blue-200 text-blue-700 dark:bg-blue-800/50 dark:text-blue-300"
            }`}>
              {isManual ? "Manual" : "Live"}
            </span>
            <Input
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              style={{ backgroundColor: 'transparent', border: 'none' }}
              className="border-none p-0 text-lg font-semibold shadow-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 bg-transparent min-w-[120px]"
            />
            {isSaving && (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            )}
            {wasRenamed && (
              <Check className="w-4 h-4 text-emerald-600" />
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onPerformanceClick}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <LineChartIcon className="h-3 w-3 mr-1" />
            Performance
          </Button>
        </div>
      </div>

      <CardHeader className="pb-2 pt-2 px-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-muted-foreground">
            {isManual ? "Total Value" : "Market Value"}
          </span>
          <span className="text-2xl font-bold tracking-tight">
            £{stats.totalValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-muted-foreground">Holdings</span>
          <span className="text-xs text-foreground">
            {(isManual ? simpleHoldings.length : holdings.length)} {allocationData.length > 0 && (
              <>
                <span className="text-muted-foreground">•</span> Top: <span className="font-medium">{allocationData[0].name}</span> ({((allocationData[0].value / stats.totalValue) * 100).toFixed(1)}%)
              </>
            )}
          </span>
        </div>
        {!isManual && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Cost basis</span>
            <span className="text-sm">£{stats.totalCost.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
          </div>
        )}
        {!isManual && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Total gain</span>
            <span className={`text-sm font-medium ${stats.totalGain >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {stats.totalGain >= 0 ? "+" : ""}£{stats.totalGain.toLocaleString("en-US", { minimumFractionDigits: 2 })} ({stats.totalGainPercent >= 0 ? "+" : ""}{stats.totalGainPercent.toFixed(2)}%)
            </span>
          </div>
        )}
        {isManual && (
          <>
            <div className="flex items-center justify-between mt-1 invisible">
              <span className="text-xs text-muted-foreground">Cost basis</span>
              <span className="text-sm">£0.00</span>
            </div>
            <div className="flex items-center justify-between invisible">
              <span className="text-xs text-muted-foreground">Total gain</span>
              <span className="text-sm font-medium">£0.00 (0.00%)</span>
            </div>
          </>
        )}
      </CardHeader>

      <CardContent className="flex-1 flex items-center justify-center pt-2 px-4 pb-5">
        {isManual ? (
          simpleHoldings.length === 0 ? (
            <EmptyHoldingsState portfolioId={id} />
          ) : allocationData.length === 0 ? (
            <NoValueHoldingsState portfolioId={id} message="No holdings with value in this portfolio." />
          ) : (
            <AllocationChart allocationData={allocationData} portfolioId={id} PieTooltip={PieTooltip} />
          )
        ) : holdings.length === 0 ? (
          <EmptyHoldingsState portfolioId={id} />
        ) : allocationData.length === 0 ? (
          <NoValueHoldingsState portfolioId={id} message="No holdings with market value in this portfolio." />
        ) : (
          <AllocationChart allocationData={allocationData} portfolioId={id} PieTooltip={PieTooltip} />
        )}
      </CardContent>
    </Card>
  )
}