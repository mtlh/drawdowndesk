"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
} from "@/components/ui/chart"

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import React, { useState } from "react";
import { monteCarloReturn } from "../../../convex/calculators/runMonteCarlo"
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { TrendingUp, GitBranch, Calculator } from "lucide-react";

export default function MonteCarloSimulator() {

  const [timePeriod, setTimePeriod] = useState(20);
  const [assetName, setAssetName] = useState("FTSE Global All Cap");

  const monteCarloReturn = useQuery(api.calculators.runMonteCarlo.getAssetReturnsforPeriods, {
    assetName: assetName,
    yearPeriod: timePeriod
  }) as unknown as monteCarloReturn;

  if (monteCarloReturn === undefined) {
    return <LoadingSpinner fullScreen message="Loading historical returns..." />
  }

  if (monteCarloReturn && monteCarloReturn.error) {
    return (
      <div className="font-sans grid place-items-center min-h-screen p-8">
        <h1 className="text-2xl font-bold text-red-600">Error: {monteCarloReturn?.error || "Unable to fetch historical returns."}</h1>
      </div>
    );
  }

  const monteCarloConfig = {
    Returns: {
      label: "Total Return by Elapsed Years",
      color: "var(--chart-1)",
    },
  } satisfies ChartConfig;

  return (
    <div className="flex min-h-screen bg-background">
      <main className="flex-1 overflow-y-auto bg-background">
        <div className="p-4 lg:p-8 space-y-6">
          {/* Header Section */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-600 to-violet-700 flex items-center justify-center shadow-lg shadow-violet-600/20">
                <Calculator className="w-7 h-7 text-white" />
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Monte Carlo Simulator</div>
                <div className="text-4xl font-bold tracking-tight">
                  Historical Returns Analysis
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <GitBranch className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {timePeriod} year period • {assetName}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <label htmlFor="year-period" className="block mb-2 font-medium text-sm text-muted-foreground">Year Period</label>
                  <Input
                    id="year-period"
                    type="number"
                    placeholder="e.g. 20"
                    className="w-full"
                    defaultValue={20}
                    step={1}
                    min={1}
                    max={55}
                    onBlur={(e) => {
                      const value = parseFloat(e.target.value);
                      if (!isNaN(value)) {
                        setTimePeriod(value);
                      }
                    }}
                  />
                </div>
                <div>
                  <label htmlFor="asset-select" className="block mb-2 font-medium text-sm text-muted-foreground">Asset</label>
                  <Select onValueChange={(value) => setAssetName(value)} defaultValue="FTSE Global All Cap">
                    <SelectTrigger id="asset-select" aria-label="Select asset">
                      <SelectValue placeholder="Select an asset" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Asset</SelectLabel>
                        <SelectItem value="FTSE Global All Cap">FTSE Global All Cap</SelectItem>
                        <SelectItem value="Gold">Gold</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {monteCarloReturn && (
            <Card className="overflow-hidden">
              <CardHeader className="pb-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-violet-600" />
                      Return Projections
                    </CardTitle>
                    <CardDescription>
                      Historical returns for {assetName} over {timePeriod} years
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {/* Percentile Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 mb-8">
                  {monteCarloReturn.percentitleReturns.map(([key, value]) => {
                    const isWorst = key === "Worst 5%";
                    const isBest = key === "Best 5%";
                    const isMedian = key === "Median";
                    return (
                      <div
                        key={key}
                        className={`relative overflow-hidden rounded-xl p-4 border ${
                          isWorst 
                            ? "bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/30 dark:to-red-900/20 border-red-200/50 dark:border-red-800/50"
                            : isBest
                            ? "bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 border-emerald-200/50 dark:border-emerald-800/50"
                            : isMedian
                            ? "bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200/50 dark:border-blue-800/50"
                            : "bg-gradient-to-br from-violet-50 to-violet-100/50 dark:from-violet-950/30 dark:to-violet-900/20 border-violet-200/50 dark:border-violet-800/50"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {isWorst && <span className="text-xs font-medium text-red-600 dark:text-red-400">{key}</span>}
                          {isBest && <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{key}</span>}
                          {isMedian && <span className="text-xs font-medium text-blue-600 dark:text-blue-400">{key}</span>}
                          {!isWorst && !isBest && !isMedian && <span className="text-xs font-medium text-violet-600 dark:text-violet-400">{key}</span>}
                        </div>
                        <span className="text-2xl font-bold">
                          {value}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {/* Chart */}
                <div className="[&_.recharts-cartesian-axis-tick_text]:!fill-muted-foreground">
                  <ChartContainer config={monteCarloConfig}>
                    <LineChart
                      accessibilityLayer
                      data={monteCarloReturn.chartdata}
                      margin={{ left: 12, right: 12, top: 10 }}
                    >
                      <CartesianGrid vertical={false} className="stroke-muted" />
                      <XAxis
                        dataKey="year"
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                        tickMargin={1}
                        domain={['auto', 'auto']}
                        label={{ value: 'Year', angle: 0, position: 'insideBottom', fill: "hsl(var(--muted-foreground))", dy: 10 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                        label={{ value: 'Return %', angle: -90, position: 'insideLeft', fill: "hsl(var(--muted-foreground))" }}
                        domain={['auto', 'auto']}
                        tickLine={false}
                        axisLine={false}
                      />
                      <ChartTooltip 
                        cursor={false} 
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          return (
                            <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg text-sm">
                              <div className="font-semibold mb-1">Year {label}</div>
                              {payload.map((entry: { dataKey?: string | number; value?: number | string | (string | number)[]; color?: string }, idx: number) => (
                                <div key={idx} className="flex justify-between gap-4">
                                  <span className="text-muted-foreground flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
                                    {String(entry.dataKey)}
                                  </span>
                                  <span className="font-medium">{typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value}%</span>
                                </div>
                              ))}
                            </div>
                          );
                        }}
                      />
                      {monteCarloReturn.caseKeys.map((key) => (
                        <Line
                          key={key}
                          type="monotone"
                          dataKey={key}
                          stroke={`#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0")}`}
                          strokeWidth={2}
                          dot={false}
                        />
                      ))}
                    </LineChart>
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};