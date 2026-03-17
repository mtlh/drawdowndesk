"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, LineChart as LineChartIcon, Check } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { ChartConfig, ChartContainer } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { Skeleton, SkeletonCard, SkeletonCardHeader, SkeletonCardTitle, SkeletonCardContent, SkeletonButton, SkeletonChart } from "@/components/ui/skeleton";
import { usePortfolioData } from "@/hooks/usePortfolioData";
import { cn } from "@/lib/utils";

const CHART_COLORS = [
  "#4F46E5", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", 
  "#06B6D4", "#EC4899", "#84CC16", "#F97316", "#6366F1"
];

type TimelineRange = "1M" | "3M" | "6M" | "YTD" | "1Y" | "ALL";

type HoldingData = {
  symbol: string;
  name: string;
  shares: number;
  currentPrice: number;
  avgPrice: number;
};

type HoldingSnapshot = {
  symbol: string;
  date: string;
  price: number;
};

export default function BenchmarkComparisonPage() {
  const portfolioData = usePortfolioData();
  const getHoldingSnapshots = useQuery(api.holdingSnapshots.snapshotCrud.getHoldingSnapshots, { months: 12 });

  const [timeline, setTimeline] = useState<TimelineRange>("1Y");
  const [enabledHoldings, setEnabledHoldings] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(true);

  // Get all holdings from all portfolios
  const allHoldings = useMemo(() => {
    if (!portfolioData.success) return [];
    return portfolioData.data.flatMap(p => p.holdings || []);
  }, [portfolioData]);

  // Group holdings by symbol
  const holdingsBySymbol = useMemo(() => {
    const grouped: Record<string, HoldingData> = {};
    for (const h of allHoldings) {
      if (grouped[h.symbol]) {
        grouped[h.symbol].shares += h.shares;
      } else {
        grouped[h.symbol] = {
          symbol: h.symbol,
          name: h.name,
          shares: h.shares,
          currentPrice: h.currentPrice,
          avgPrice: h.avgPrice,
        };
      }
    }
    return grouped;
  }, [allHoldings]);

  // Process snapshots into price history by symbol
  const priceHistoryBySymbol = useMemo(() => {
    if (!getHoldingSnapshots || !Array.isArray(getHoldingSnapshots)) return {};
    
    const grouped: Record<string, HoldingSnapshot[]> = {};
    for (const snap of getHoldingSnapshots) {
      if (!snap.symbol) continue;
      const date = new Date(snap.snapshotDate).toLocaleDateString("en-GB", { month: "short", day: "numeric" });
      if (!grouped[snap.symbol]) {
        grouped[snap.symbol] = [];
      }
      grouped[snap.symbol].push({ symbol: snap.symbol, date, price: snap.price });
    }
    
    // Sort each by date
    for (const symbol of Object.keys(grouped)) {
      grouped[symbol].sort((a, b) => {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });
    }
    
    return grouped;
  }, [getHoldingSnapshots]);

  // Calculate percentage data for each holding
  const holdingsWithPerformance = useMemo(() => {
    return Object.entries(holdingsBySymbol).map(([symbol, h], index) => {
      const history = priceHistoryBySymbol[symbol] || [];
      const firstPrice = history[0]?.price || h.currentPrice;
      const currentPrice = h.currentPrice;
      
      // Calculate % change from first price to current (not cost basis)
      const percentChange = firstPrice > 0 ? ((currentPrice - firstPrice) / firstPrice) * 100 : 0;
      
      return {
        symbol,
        name: h.name,
        shares: h.shares,
        currentPrice: h.currentPrice,
        avgPrice: h.avgPrice,
        firstPrice,
        percentChange,
        color: CHART_COLORS[index % CHART_COLORS.length],
        history,
      };
    }).filter(h => h.history.length > 0);
  }, [holdingsBySymbol, priceHistoryBySymbol]);

  // Initialize enabled holdings on first load
  const initialized = useRef(false);
  useEffect(() => {
    if (holdingsWithPerformance.length > 0 && !initialized.current) {
      initialized.current = true;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEnabledHoldings(new Set(holdingsWithPerformance.map(h => h.symbol)));
    }
  }, [holdingsWithPerformance]);

  const toggleHolding = (symbol: string) => {
    const newSet = new Set(enabledHoldings);
    if (newSet.has(symbol)) {
      newSet.delete(symbol);
    } else {
      newSet.add(symbol);
    }
    setEnabledHoldings(newSet);
  };

  const toggleAll = () => {
    if (selectAll) {
      setEnabledHoldings(new Set());
    } else {
      setEnabledHoldings(new Set(holdingsWithPerformance.map(h => h.symbol)));
    }
    setSelectAll(!selectAll);
  };

  // Get all unique dates from all enabled holdings
  const allDates = useMemo(() => {
    const dateSet = new Set<string>();
    for (const h of holdingsWithPerformance) {
      if (enabledHoldings.has(h.symbol)) {
        for (const snap of h.history) {
          dateSet.add(snap.date);
        }
      }
    }
    return Array.from(dateSet).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  }, [holdingsWithPerformance, enabledHoldings]);

  // Build chart data with percentage changes
  const chartData = useMemo(() => {
    return allDates.map(date => {
      const dataPoint: Record<string, string | number | HoldingData> = { date };
      
      for (const h of holdingsWithPerformance) {
        if (!enabledHoldings.has(h.symbol)) continue;
        
        const snap = h.history.find(s => s.date === date);
        if (snap && h.firstPrice > 0) {
          const percentChange = ((snap.price - h.firstPrice) / h.firstPrice) * 100;
          dataPoint[h.symbol] = percentChange;
          // Store full holding data for tooltip
          (dataPoint as Record<string, unknown>)[`_${h.symbol}_data`] = h;
        } else {
          dataPoint[h.symbol] = 0;
        }
      }
      
      return dataPoint;
    });
  }, [allDates, holdingsWithPerformance, enabledHoldings]);

  // Build chart config
  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};
    for (const h of holdingsWithPerformance) {
      if (enabledHoldings.has(h.symbol)) {
        config[h.symbol] = { label: h.symbol, color: h.color };
      }
    }
    return config;
  }, [holdingsWithPerformance, enabledHoldings]);

  // Filtered holdings for display
  const enabledHoldingsList = holdingsWithPerformance.filter(h => enabledHoldings.has(h.symbol));

  if (portfolioData.isLoading) {
    return (
      <div className="flex min-h-screen bg-background">
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-background pr-4">
          <div className="p-4 lg:p-8 space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <Skeleton className="w-14 h-14 rounded-xl" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-8 w-64" />
                  <Skeleton className="h-4 w-48" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-24" />
              <div className="flex gap-1">
                {["1M", "3M", "6M", "YTD", "1Y", "ALL"].map((range) => (
                  <SkeletonButton key={range} />
                ))}
              </div>
            </div>

            <SkeletonCard>
              <SkeletonCardHeader>
                <div className="flex items-center justify-between">
                  <SkeletonCardTitle />
                  <Skeleton className="h-8 w-24" />
                </div>
                <Skeleton className="h-4 w-64 mt-2" />
              </SkeletonCardHeader>
              <SkeletonCardContent>
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-20 rounded-lg" />
                  ))}
                </div>
              </SkeletonCardContent>
            </SkeletonCard>

            <SkeletonCard>
              <SkeletonCardHeader>
                <div className="flex items-center gap-2">
                  <Skeleton className="w-5 h-5 rounded-full" />
                  <SkeletonCardTitle />
                </div>
                <Skeleton className="h-4 w-72 mt-2" />
              </SkeletonCardHeader>
              <SkeletonCardContent>
                <SkeletonChart />
              </SkeletonCardContent>
            </SkeletonCard>
          </div>
        </main>
      </div>
    );
  }

  if (!portfolioData.success) {
    return (
      <div className="flex min-h-screen bg-background items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Error Loading Portfolio</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{portfolioData.error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <main className="flex-1 overflow-y-auto overflow-x-hidden bg-background pr-4">
        <div className="p-4 lg:p-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-600 to-violet-700 flex items-center justify-center shadow-lg shadow-violet-600/20">
                <TrendingUp className="w-7 h-7 text-white" />
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Performance Analysis</div>
                <div className="text-4xl font-bold tracking-tight">Holdings Performance</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Compare performance of your holdings by market price
                </div>
              </div>
            </div>
          </div>

          {/* Timeline Selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Time Period:</span>
            <div className="flex gap-1 p-1 bg-muted/50 rounded-lg">
              {(["1M", "3M", "6M", "YTD", "1Y", "ALL"] as TimelineRange[]).map((range) => (
                <Button
                  key={range}
                  variant={timeline === range ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setTimeline(range)}
                  className={cn(
                    "h-8 px-3 text-xs font-medium rounded-md transition-all",
                    timeline === range 
                      ? "shadow-sm" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  {range}
                </Button>
              ))}
            </div>
          </div>

          {/* Holdings Toggle Buttons */}
          <Card className="border-muted/60">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-violet-500" />
                  Holdings to Compare
                </CardTitle>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={toggleAll}
                  className="gap-2"
                >
                  {selectAll ? "Disable All" : "Enable All"}
                </Button>
              </div>
              <CardDescription>Click to toggle holdings on the chart</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {holdingsWithPerformance.map((h) => {
                  const isEnabled = enabledHoldings.has(h.symbol);
                  return (
                    <button
                      key={h.symbol}
                      onClick={() => toggleHolding(h.symbol)}
                      className={cn(
                        "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all border",
                        isEnabled 
                          ? "border-transparent shadow-sm" 
                          : "border-border/60 bg-background text-muted-foreground hover:border-muted-foreground hover:text-foreground"
                      )}
                      style={isEnabled ? { 
                        backgroundColor: h.color + "20", 
                        borderColor: h.color,
                        color: h.color
                      } : {}}
                    >
                      {isEnabled && <Check className="w-3.5 h-3.5" />}
                      <span className="font-semibold">{h.symbol}</span>
                      <span className={cn(
                        "text-xs px-1.5 py-0.5 rounded",
                        isEnabled 
                          ? h.percentChange >= 0 ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" : "bg-red-500/20 text-red-700 dark:text-red-300"
                          : "text-muted-foreground"
                      )}>
                        {h.percentChange >= 0 ? "+" : ""}{h.percentChange.toFixed(1)}%
                      </span>
                    </button>
                  );
                })}
              </div>
              {holdingsWithPerformance.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                    <LineChartIcon className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    No holding price history available. Refresh your holdings to track performance.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Performance Chart */}
          <Card className="border-muted/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChartIcon className="w-5 h-5 text-violet-500" />
                Percentage Performance
              </CardTitle>
              <CardDescription>Percentage gain/loss by holding (market price based)</CardDescription>
            </CardHeader>
            <CardContent className="overflow-visible">
              {enabledHoldingsList.length > 0 && chartData.length > 0 ? (
                <div className="overflow-visible">
                  <ChartContainer config={chartConfig} className="h-[calc(100vh-350px)] min-h-[500px] w-full overflow-visible">
                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      {enabledHoldingsList.map((h) => (
                        <linearGradient key={h.symbol} id={`gradient-${h.symbol}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={h.color} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={h.color} stopOpacity={0}/>
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis
                      dataKey="date"
                      stroke="hsl(var(--muted-foreground))"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "currentColor", fontSize: 11 }}
                      dy={10}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      tickFormatter={(value) => `${value >= 0 ? "+" : ""}${value.toFixed(0)}%`}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "currentColor", fontSize: 11 }}
                      domain={["auto", "auto"]}
                      dx={-10}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        return (
                          <div className="bg-card/95 backdrop-blur-sm border border-border/60 rounded-xl px-4 py-3 shadow-xl text-sm min-w-[320px] z-[100] pointer-events-none">
                            <div className="font-semibold text-base border-b border-border/60 pb-2 mb-3">{label}</div>
                            <div className="flex flex-col space-y-2.5 max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent pointer-events-auto">
                              {payload.map((entry) => {
                                const holdingData = (entry.payload as Record<string, unknown>)[`_${entry.dataKey}_data`] as HoldingData | undefined;
                                const value = entry.value as number;
                                return (
                                  <div key={entry.dataKey as string} className="flex justify-between items-start gap-4">
                                    <div className="flex items-center gap-2.5">
                                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                                      <div>
                                        <span className="font-semibold">{entry.name}</span>
                                        {holdingData && (
                                          <div className="text-xs text-muted-foreground">
                                            {holdingData.name.length > 30 ? holdingData.name.slice(0, 30) + "..." : holdingData.name}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className={cn(
                                        "font-bold text-base",
                                        value >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                                      )}>
                                        {value >= 0 ? "+" : ""}{value.toFixed(2)}%
                                      </div>
                                      {holdingData && (
                                        <div className="text-xs text-muted-foreground">
                                          £{holdingData.currentPrice.toFixed(2)}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Legend 
                      wrapperStyle={{ paddingTop: "20px" }}
                      formatter={(value) => <span className="text-sm font-medium">{value}</span>}
                    />
                    {enabledHoldingsList.map((h) => (
                      <Line
                        key={h.symbol}
                        type="monotone"
                        dataKey={h.symbol}
                        name={h.symbol}
                        stroke={h.color}
                        strokeWidth={2.5}
                        dot={false}
                        activeDot={{ r: 5, strokeWidth: 2 }}
                      />
                    ))}
                  </LineChart>
                  </ChartContainer>
                </div>
              ) : (
                <div className="h-[300px] flex flex-col items-center justify-center text-center p-6">
                  <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                    <LineChartIcon className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-lg font-semibold mb-2">No holdings selected</p>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Toggle on holdings above to see their performance comparison.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
