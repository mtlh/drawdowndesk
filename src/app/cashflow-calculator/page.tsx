"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

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
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Input } from "@/components/ui/input"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

import { CreateTakeHome, TaxInfo } from "@/lib/createTakeHome";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useMemo, useState } from "react";
import React from "react";

export default function RetirementIncomeCalculator() {

  const taxBandInformation = useQuery(api.runTaxQuery.getTaxInfoForIncome, {
    taxYear: 2025
  }) as TaxInfo;

  const [startAge, setStartAge] = useState(55); // Starting age for the retirement years
  const [pensionValue, setPensionValue] = useState(700000); // Starting pension value
  const [growthRate, setGrowthRate] = useState(0.05); // 5% annual growth
  const [withdrawRate, setWithdrawRate] = useState(0.03); // 3% annual withdrawal
  const [inflationRate, setInflationRate] = useState(0.03); // 3% annual inflation

  const [pensionGrowth] = useState(0); // value of yearly pension growth

  const endAge = 100; // Ending age for the retirement years
  const retirementYears = Array.from({ length: endAge - startAge + 1 }, (_, i) => startAge + i);

 const incomeChartData = useChartData(
    pensionValue,
    pensionGrowth,
    growthRate,
    withdrawRate,
    retirementYears,
    inflationRate,
    taxBandInformation
  );

  const [incomeActiveChart, setIncomeActiveChart] =
    React.useState<keyof typeof incomeConfig>("takeHomePay")
  const incometotal = React.useMemo(
    () => ({
      takeHomePay: incomeChartData.reduce((acc, curr) => acc + curr.takeHomePay, 0),
      nationalInsurance: incomeChartData.reduce((acc, curr) => acc + curr.nationalInsurance, 0),
    }),
    [incomeChartData]
  )

   const [pensionActiveChart, setPensionActiveChart] =
    React.useState<keyof typeof pensionValueConfig>("pensionValue")
  const pensiontotal = React.useMemo(
    () => ({
      pensionValue: incomeChartData.reduce((acc, curr) => acc + curr.pensionValue, 0),
      pensionGrowth: incomeChartData.reduce((acc, curr) => acc + curr.pensionGrowth, 0),
    }),
    [incomeChartData]
  )

  if (taxBandInformation && taxBandInformation.error) {
    return (
      <div className="font-sans grid place-items-center min-h-screen p-8">
        <h1 className="text-2xl font-bold text-red-600">Error: {taxBandInformation?.error || "Unable to fetch tax information."}</h1>
      </div>
    );
  }

  const incomeConfig = {
    takeHomePay: {
      label: "Take Home",
      color: "var(--chart-1)",
    },
    nationalInsurance: {
      label: "NI",
      color: "var(--chart-2)",
    },
    incomeTax: {
      label: "Income Tax",
      color: "var(--chart-3)",
    },
  } satisfies ChartConfig;

  const pensionValueConfig = {
    pensionValue: {
      label: "Value",
      color: "var(--chart-4)",
    },
    pensionGrowth: {
      label: "Yearly Growth",
      color: "var(--chart-5)",
    },
  } satisfies ChartConfig;

  return (
    <div className="font-sans grid grid-rows-[auto_1fr_auto] min-h-screen p-8 gap-8  bg-background">
      {/* INPUT SECTION */}
      <h1 className="text-2xl font-bold">Retirement Cashflow Calculator</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 w-full max-w-3xl">
        <div>
          <label className="block mb-2 font-medium text-sm text-muted-foreground">Starting Age</label>
          <Input
            type="number"
            placeholder="e.g. 30"
            className="w-full p-2 border rounded-md bg-card"
            defaultValue={55}
            onBlur={(e) => {
              const value = parseFloat(e.target.value);
              if (!isNaN(value)) {
                setStartAge(value);
              }
            }}
          />
        </div>
        <div>
          <label className="block mb-2 font-medium text-sm text-muted-foreground">Starting Pension Value</label>
          <Input
            type="number"
            step="1000"
            placeholder="e.g. 700k"
            className="w-full p-2 border rounded-md bg-card"
            defaultValue={700000}
            onBlur={(e) => {
              const value = parseFloat(e.target.value);
              if (!isNaN(value)) {
                setPensionValue(value);
              }
            }}
          />
        </div>
        <div>
          <label className="block mb-2 font-medium text-sm text-muted-foreground">Growth Rate (%)</label>
          <Input
            type="number"
            step="0.1"
            placeholder="e.g. 5"
            className="w-full p-2 border rounded-md bg-card"
            defaultValue={5}
            onBlur={(e) => {
              const value = parseFloat(e.target.value) / 100;
              if (!isNaN(value)) {
                setGrowthRate(value);
              }
            }}
          />
        </div>
        <div>
          <label className="block mb-2 font-medium text-sm text-muted-foreground">Withdraw Rate (%)</label>
          <Input
            type="number"
            step="0.01"
            placeholder="e.g. 3"
            className="w-full p-2 border rounded-md bg-card"
            defaultValue={3}
            onBlur={(e) => {
              const value = parseFloat(e.target.value) / 100;
              if (!isNaN(value)) {
                setWithdrawRate(value);
              }
            }}
          />
        </div>
        <div>
          <label className="block mb-2 font-medium text-sm text-muted-foreground">Inflation Rate (%)</label>
          <Input
            type="number"
            step="0.1"
            placeholder="e.g. 3"
            className="w-full p-2 border rounded-md bg-card"
            defaultValue={3}
            onBlur={(e) => {
              const value = parseFloat(e.target.value) / 100;
              if (!isNaN(value)) {
                setInflationRate(value);
              }
            }}
          />
        </div>
      </div>
      
      <Card className="py-0">
        <CardHeader className="flex flex-col items-stretch border-b !p-0 sm:flex-row">
          <div className="flex flex-1 flex-col justify-center gap-1 px-6 pt-4 pb-3 sm:!py-0">
            <CardTitle>Retirement Income Breakdown (£)</CardTitle>
            <CardDescription>
              Showing the breakdown of income tax, national insurance, and take-home pay over the retirement years.
            </CardDescription>
          </div>
          <div className="flex">
            {["takeHomePay", "nationalInsurance"].map((key) => {
              const chart = key as keyof typeof incomeConfig
              return (
                <button
                  key={chart}
                  data-active={incomeActiveChart === chart}
                  className="data-[active=true]:bg-muted/50 relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l sm:border-t-0 sm:border-l sm:px-8 sm:py-6"
                  onClick={() => setIncomeActiveChart(chart)}
                >
                  <span className="text-muted-foreground text-xs">
                    {incomeConfig[chart].label}
                  </span>
                  <span className="text-lg leading-none font-bold sm:text-3xl">
                    {incometotal[key as keyof typeof incometotal].toLocaleString()}
                  </span>
                </button>
              )
            })}
          </div>
        </CardHeader>
        <CardContent className="px-2 sm:p-6">
          <ChartContainer
            config={incomeConfig}
            className="aspect-auto h-[250px] w-full"
          >
          <BarChart
            accessibilityLayer
            data={incomeChartData}
            margin={{
              left: 30,
              right: 5,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
                dataKey="age"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
            />
            <YAxis
              dataKey="withdrawAmount"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
            />
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar
                dataKey="takeHomePay"
                stackId="a"
                fill="var(--color-takeHomePay)"
                radius={[0, 0, 4, 4]}
              />
              <Bar
                dataKey="nationalInsurance"
                stackId="a"
                fill="var(--color-nationalInsurance)"
              />
              <Bar
                dataKey="incomeTax"
                stackId="a"
                fill="var(--color-incomeTax)"
                radius={[4, 4, 0, 0]}
              />
            {/* <Bar dataKey={activeChart} fill={`var(--color-${activeChart})`} /> */}
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="py-0">
        <CardHeader className="flex flex-col items-stretch border-b !p-0 sm:flex-row">
          <div className="flex flex-1 flex-col justify-center gap-1 px-6 pt-4 pb-3 sm:!py-0">
            <CardTitle>Pension Pot Value (£)</CardTitle>
            <CardDescription>
              Showing the value of the pension pot over the retirement years.
            </CardDescription>
          </div>
          <div className="flex">
            {["pensionValue", "pensionGrowth"].map((key) => {
              const chart = key as keyof typeof pensionValueConfig
              return (
                <button
                  key={chart}
                  data-active={pensionActiveChart === chart}
                  className="data-[active=true]:bg-muted/50 relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l sm:border-t-0 sm:border-l sm:px-8 sm:py-6"
                  onClick={() => setPensionActiveChart(chart)}
                >
                  <span className="text-muted-foreground text-xs">
                    {pensionValueConfig[chart].label}
                  </span>
                  <span className="text-lg leading-none font-bold sm:text-3xl">
                    {pensiontotal[key as keyof typeof pensiontotal].toLocaleString()}
                  </span>
                </button>
              )
            })}
          </div>
        </CardHeader>
        <CardContent className="px-2 sm:p-6">
          <ChartContainer
            config={pensionValueConfig}
            className="aspect-auto h-[250px] w-full"
          >
          <BarChart
            accessibilityLayer
            data={incomeChartData}
            margin={{
              left: 30,
              right: 5,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
                dataKey="age"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
            />
            <YAxis
              dataKey="pensionValue"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
            />
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar
                dataKey="pensionValue"
                stackId="a"
                fill="var(--color-pensionValue)"
                radius={[0, 0, 4, 4]}
              />
              <Bar
                dataKey="pensionGrowth"
                stackId="a"
                fill="var(--color-pensionGrowth)"
                radius={[4, 4, 0, 0]}
              />
            {/* <Bar dataKey={activeChart} fill={`var(--color-${activeChart})`} /> */}
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Assumptions */}
      <Accordion
        type="single"
        collapsible
        className="w-full"
        defaultValue="assumptions"
      >
        <AccordionItem value="assumptions">
          <AccordionTrigger>📐 Model Assumptions</AccordionTrigger>
          <AccordionContent>
            This calculator is based on the assumption that the tax rate is constant and the same for all years. 
            This means tax will not change over time. Inflation also remains constant, 
            so pension value and spending power evolve predictably. Withdrawals occur at a fixed percentage annually.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="limitations">
          <AccordionTrigger>⚖️ Limitations</AccordionTrigger>
          <AccordionContent>
            - Market volatility is not modeled; results ignore crash recovery or sequence-of-return risk.  
            - Longevity risk isn’t addressed—fixed retirement lengths may not match real lifespans.  
            - Asset allocation and diversification effects are excluded.  
            - Fees, advisory costs, and taxes on dividends or gains are omitted.  
            - Spending remains static year-on-year, which may not reflect changing needs.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="guidance">
          <AccordionTrigger>🧭 Usage Guidance</AccordionTrigger>
          <AccordionContent>
            This tool offers illustrative projections—not guarantees. Results should not replace personalized advice from a certified financial planner. Use it to explore scenarios, but verify assumptions and adjust inputs for your unique financial context.
          </AccordionContent>
        </AccordionItem>
    </Accordion>
    </div>
  );
}

const useChartData = (
  pensionValue: number,
  pensionGrowth: number,
  growthRate: number,
  withdrawRate: number,
  retirementYears: number[],
  inflationRate: number,
  taxBandInformation: TaxInfo
) => {
  return useMemo(() => {
    let currentPensionValue = pensionValue;

    return retirementYears.map((age) => {

      const previousPensionValue = currentPensionValue;
      currentPensionValue *= 1 + growthRate;
      const growth = currentPensionValue - previousPensionValue;
      currentPensionValue /= 1 + inflationRate;

      const withdrawAmount = currentPensionValue * withdrawRate;
      currentPensionValue -= withdrawAmount;

      const taxInfo = CreateTakeHome(taxBandInformation, withdrawAmount);

      return {
        age,
        takeHomePay: taxInfo.takeHomePay,
        nationalInsurance: taxInfo.nationalInsurance,
        incomeTax: taxInfo.incomeTax,
        pensionValue: currentPensionValue,
        pensionGrowth: growth,
        withdrawAmount,
      };
    });
  }, [pensionValue, growthRate, withdrawRate, retirementYears, inflationRate, taxBandInformation]);
};
