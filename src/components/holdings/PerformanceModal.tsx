"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { LineChart as LineChartIcon } from "lucide-react"
import { ResponsiveContainer, Tooltip as RechartsTooltip, LineChart, Line, CartesianGrid, XAxis, YAxis } from "recharts"
import { ChartTooltip } from "@/components/chart-tooltip"

type TimelineRange = "5D" | "1W" | "1M" | "YTD" | "1Y"

interface Snapshot {
  portfolioId?: string
  totalValue: number
  snapshotDate: string
}

interface PerformanceModalProps {
  isOpen: boolean
  onClose: () => void
  portfolioName: string
  portfolioId: string | null
  snapshots: Snapshot[]
  currentValue: number
}

export function PerformanceModal({
  isOpen,
  onClose,
  portfolioName,
  portfolioId,
  snapshots,
  currentValue,
}: PerformanceModalProps) {
  const [selectedTimeline, setSelectedTimeline] = useState<TimelineRange>("1M")

  const filteredSnapshots = useMemo(() => {
    if (!portfolioId) return []
    const filtered = snapshots.filter(s => String(s.portfolioId ?? "") === portfolioId)
    const sorted = [...filtered].sort((a, b) => a.snapshotDate.localeCompare(b.snapshotDate))
    
    const now = new Date()
    const cutoff = new Date()
    switch (selectedTimeline) {
      case "5D":
        cutoff.setDate(now.getDate() - 5)
        break
      case "1W":
        cutoff.setDate(now.getDate() - 7)
        break
      case "1M":
        cutoff.setMonth(now.getMonth() - 1)
        break
      case "YTD":
        cutoff.setMonth(0)
        cutoff.setDate(1)
        break
      case "1Y":
        cutoff.setFullYear(now.getFullYear() - 1)
        break
    }
    return sorted.filter(s => new Date(s.snapshotDate) >= cutoff)
  }, [snapshots, portfolioId, selectedTimeline])

  const { periodReturn, periodReturnPercent, periodHigh, periodLow } = useMemo(() => {
    let periodReturn: number | null = null
    let periodReturnPercent: number | null = null
    let periodHigh = 0
    let periodLow = 0

    if (filteredSnapshots.length >= 2) {
      const startValue = filteredSnapshots[0].totalValue
      const endValue = filteredSnapshots[filteredSnapshots.length - 1].totalValue
      periodReturn = endValue - startValue
      periodReturnPercent = startValue > 0 ? (periodReturn / startValue) * 100 : 0
      filteredSnapshots.forEach(s => {
        if (s.totalValue > periodHigh) periodHigh = s.totalValue
        if (s.totalValue < periodLow) periodLow = s.totalValue
      })
    } else if (filteredSnapshots.length === 1) {
      periodHigh = filteredSnapshots[0].totalValue
      periodLow = filteredSnapshots[0].totalValue
    }

    return { periodReturn, periodReturnPercent, periodHigh, periodLow }
  }, [filteredSnapshots])

  const chartData = useMemo(() => 
    filteredSnapshots.map(s => ({
      date: new Date(s.snapshotDate).toLocaleDateString("en-GB", { month: "short", day: "numeric" }),
      value: s.totalValue,
    })),
    [filteredSnapshots]
  )

  const CustomTooltip = ChartTooltip({})

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-2xl font-bold flex items-center gap-3">
            <LineChartIcon className="h-6 w-6 text-primary" />
            {portfolioName}
          </DialogTitle>
          <DialogDescription className="text-base">
            View historical performance data for this portfolio over time.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-5 border border-primary/20">
              <div className="text-sm text-muted-foreground mb-2">Current Value</div>
              <div className="text-2xl font-bold">£{currentValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
            <div className={`rounded-xl p-5 border ${periodReturn !== null && periodReturn >= 0 ? "bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20" : periodReturn !== null ? "bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20" : "bg-muted/30 border-border"}`}>
              <div className="text-sm text-muted-foreground mb-2">Period Return</div>
              {periodReturn !== null ? (
                <>
                  <div className="text-2xl font-bold leading-tight">
                    <span className={periodReturn >= 0 ? "text-green-600" : "text-red-600"}>
                      {periodReturn >= 0 ? "+" : ""}£{periodReturn.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className={`text-base mt-1 ${periodReturn >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {periodReturnPercent !== null && (periodReturnPercent >= 0 ? "+" : "")}{periodReturnPercent !== null ? periodReturnPercent.toFixed(2) : "—"}%
                  </div>
                </>
              ) : (
                <div className="text-2xl font-bold text-muted-foreground">—</div>
              )}
            </div>
          </div>

          {filteredSnapshots.length >= 1 && (
            <div className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 rounded-xl p-5 border border-amber-500/20">
              <div className="text-sm text-muted-foreground mb-2">Period Range</div>
              <div className="text-xl font-semibold">£{periodLow.toLocaleString("en-US", { minimumFractionDigits: 0 })} - £{periodHigh.toLocaleString("en-US", { minimumFractionDigits: 0 })}</div>
            </div>
          )}

          <div className="flex items-center gap-1 justify-center bg-muted/50 rounded-lg p-1">
            {(["5D", "1W", "1M", "YTD", "1Y"] as TimelineRange[]).map((range) => (
              <Button
                key={range}
                variant={selectedTimeline === range ? "default" : "ghost"}
                size="sm"
                onClick={() => setSelectedTimeline(range)}
                className={`h-8 px-4 text-xs font-medium ${selectedTimeline === range ? "shadow-sm" : "text-muted-foreground"}`}
              >
                {range}
              </Button>
            ))}
          </div>

          {filteredSnapshots.length >= 1 ? (
            <div className="relative [&_.recharts-cartesian-axis-tick_text]:!fill-muted-foreground">
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="modalPortfolioValueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4F46E5" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#4F46E5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    tickFormatter={(value) => `£${(value / 1000).toFixed(0)}k`}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    dx={-10}
                  />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#4F46E5"
                    strokeWidth={3}
                    dot={{ fill: "#4F46E5", strokeWidth: 0, r: 4 }}
                    activeDot={{ r: 6, fill: "#4F46E5" }}
                    fill="url(#modalPortfolioValueGradient)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[320px] flex flex-col items-center justify-center text-muted-foreground bg-muted/30 rounded-lg border-2 border-dashed">
              <LineChartIcon className="h-12 w-12 mb-3 opacity-50" />
              <p className="text-sm">No historical data for this portfolio yet.</p>
              <p className="text-xs mt-1">Performance tracking starts after the first snapshot is saved.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}