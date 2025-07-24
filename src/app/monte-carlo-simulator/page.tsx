"use client";

import { CartesianGrid, Line, LineChart, XAxis } from "recharts"

import {
  Card,
  CardContent,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import React, { useState } from "react";
import { monteCarloReturn } from "../../../convex/runMonteCarlo";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function MonteCarloSimulator() {

  const [timePeriod, setTimePeriod] = useState(20);
  const [assetName, setAssetName] = useState("FTSE Global All Cap");

  const monteCarloReturn = useQuery(api.runMonteCarlo.getAssetReturnsforPeriods, {
    assetName: assetName,
    yearPeriod: timePeriod
  }) as unknown as monteCarloReturn;

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
    <div className="font-sans grid grid-rows-[auto_1fr_auto] min-h-screen p-8 gap-8  bg-background">
      {/* INPUT SECTION */}
      <h1 className="text-2xl font-bold">Monte Carlo Simulator</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 w-full max-w-3xl">
        <div>
          <label className="block mb-2 font-medium text-sm text-muted-foreground">Year Period</label>
          <Input
            type="number"
            placeholder="e.g. 20"
            className="w-full p-2 border rounded-md bg-card"
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
          <label className="block mb-2 font-medium text-sm text-muted-foreground">Asset</label>
          <Select onValueChange={(value) => setAssetName(value)} defaultValue="FTSE Global All Cap">
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select an asset" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Asset</SelectLabel>
                <SelectItem value="FTSE Global All Cap">FTSE Global All Cap</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>
      {monteCarloReturn && (
        <Card className="py-0">
          <CardContent className="px-2 sm:p-6">
            <ChartContainer config={monteCarloConfig}>
              <LineChart
                accessibilityLayer
                data={monteCarloReturn.chartdata}
                margin={{ left: 12, right: 12 }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="year"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={1}
                />
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                {/* Dynamically render lines for each case */}
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
          </CardContent>
        </Card>
      )}
    </div>
  );
};