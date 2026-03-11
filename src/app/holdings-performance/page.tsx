"use client";

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, LineChart as LineChartIcon, Check } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { ChartConfig, ChartContainer } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { usePortfolioData } from "@/hooks/usePortfolioData";

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
  useEffect(() => {
    if (holdingsWithPerformance.length > 0 && enabledHoldings.size === 0) {
      const all = new Set(holdingsWithPerformance.map(h => h.symbol));
      setEnabledHoldings(all);
    }
  }, [holdingsWithPerformance, enabledHoldings.size]);

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
    return <LoadingSpinner fullScreen message="Loading portfolio..." />;
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
            <span className="text-sm text-muted-foreground">Time Period:</span>
            <div className="flex gap-1">
              {(["1M", "3M", "6M", "YTD", "1Y", "ALL"] as TimelineRange[]).map((range) => (
                <Button
                  key={range}
                  variant={timeline === range ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTimeline(range)}
                >
                  {range}
                </Button>
              ))}
            </div>
          </div>

          {/* Holdings Toggle Buttons */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Holdings</CardTitle>
                <Button variant="outline" size="sm" onClick={toggleAll}>
                  {selectAll ? "Disable All" : "Enable All"}
                </Button>
              </div>
              <CardDescription>Click to toggle holdings on the chart</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {holdingsWithPerformance.map((h) => (
                  <Button
                    key={h.symbol}
                    variant={enabledHoldings.has(h.symbol) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleHolding(h.symbol)}
                    className="gap-2"
                    style={enabledHoldings.has(h.symbol) ? { backgroundColor: h.color, borderColor: h.color } : {}}
                  >
                    {enabledHoldings.has(h.symbol) && <Check className="w-3 h-3" />}
                    {h.symbol}
                    <span className={`text-xs ${h.percentChange >= 0 ? "text-emerald-200" : "text-red-200"}`}>
                      {h.percentChange >= 0 ? "+" : ""}{h.percentChange.toFixed(1)}%
                    </span>
                  </Button>
                ))}
              </div>
              {holdingsWithPerformance.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No holding price history available. Refresh your holdings to track performance.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Performance Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChartIcon className="w-5 h-5" />
                Percentage Performance
              </CardTitle>
              <CardDescription>Percentage gain/loss by holding (market price based)</CardDescription>
            </CardHeader>
            <CardContent>
              {enabledHoldingsList.length > 0 && chartData.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-[calc(100vh-350px)] min-h-[500px] w-full">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="date"
                      stroke="hsl(var(--muted-foreground))"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "currentColor", fontSize: 11 }}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      tickFormatter={(value) => `${value >= 0 ? "+" : ""}${value.toFixed(0)}%`}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "currentColor", fontSize: 11 }}
                      domain={["auto", "auto"]}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        return (
                          <div className="bg-card border border-border rounded-lg px-4 py-3 shadow-lg text-sm min-w-[320px]">
                            <div className="font-semibold border-b border-border pb-2 mb-2">{label}</div>
                            <div className="space-y-2 max-h-[300px] overflow-y-auto">
                              {payload.map((entry) => {
                                const holdingData = (entry.payload as Record<string, unknown>)[`_${entry.dataKey}_data`] as HoldingData | undefined;
                                const value = entry.value as number;
                                return (
                                  <div key={entry.dataKey as string} className="flex justify-between items-start gap-4">
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                        <span className="font-medium">{entry.name}</span>
                                      </div>
                                      {holdingData && (
                                        <div className="text-xs text-muted-foreground ml-4">
                                          {holdingData.name}
                                        </div>
                                      )}
                                    </div>
                                    <div className="text-right">
                                      <div className={`font-bold ${value >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                                        {value >= 0 ? "+" : ""}{value.toFixed(2)}%
                                      </div>
                                      {holdingData && (
                                        <div className="text-xs text-muted-foreground">
                                          £{holdingData.currentPrice.toFixed(2)} • {(holdingData.shares).toLocaleString()} shares
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
                    <Legend />
                    {enabledHoldingsList.map((h) => (
                      <Line
                        key={h.symbol}
                        type="monotone"
                        dataKey={h.symbol}
                        name={h.symbol}
                        stroke={h.color}
                        strokeWidth={2}
                        dot={false}
                      />
                    ))}
                  </LineChart>
                </ChartContainer>
              ) : (
                <div className="h-[300px] flex flex-col items-center justify-center text-center p-6">
                  <LineChartIcon className="w-12 h-12 text-muted-foreground mb-3" />
                  <p className="text-lg font-semibold mb-2">No holdings selected</p>
                  <p className="text-sm text-muted-foreground">
                    Toggle on holdings above to see their performance.
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
