"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartLegend,
} from "@/components/ui/chart"
import {
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts"
import { TrendingUp } from "lucide-react"

interface PotValueChartCardProps {
  chartData: {
    age: number
    pensionPot: number
    isaPot: number
    giaPot: number
  }[]
}

const potConfig = {
  pension: { label: "Pension", color: "#22c55e" },
  isa: { label: "ISA", color: "#3b82f6" },
  gia: { label: "GIA", color: "#f97316" },
} satisfies ChartConfig

export function PotValueChartCard({ chartData }: PotValueChartCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Account Values Over Time
            </CardTitle>
            <CardDescription>Projected value of each account</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={potConfig} className="h-[320px] w-full">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorPension" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15}/>
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorISA" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorGIA" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.15}/>
                <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="age" 
              stroke="hsl(var(--muted-foreground))" 
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} 
              tickLine={false} 
              tickMargin={8} 
              axisLine={false} 
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))" 
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} 
              tickLine={false} 
              tickMargin={8} 
              tickFormatter={(v) => `£${(v/1000000).toFixed(1)}M`} 
              axisLine={false}
              width={55}
            />
            <ChartTooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const total = payload.reduce((sum, entry) => sum + (Number(entry.value) || 0), 0);
                return (
                  <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg text-sm min-w-[200px]">
                    <div className="font-semibold border-b border-border pb-1.5 mb-1.5">Age {label}</div>
                    {payload.map((entry: { dataKey?: string | number; value?: number | string | (string | number)[]; color?: string }) => (
                      <div key={String(entry.dataKey)} className="flex justify-between gap-4">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
                          {potConfig[String(entry.dataKey) as keyof typeof potConfig]?.label || String(entry.dataKey)}
                        </span>
                        <span className="font-medium">£{((entry.value ?? 0) as number).toLocaleString("en-US", { minimumFractionDigits: 0 })}</span>
                      </div>
                    ))}
                    <div className="flex justify-between gap-4 border-t border-border pt-1.5 mt-1.5 font-semibold">
                      <span className="text-muted-foreground">Total</span>
                      <span>£{total.toLocaleString("en-US", { minimumFractionDigits: 0 })}</span>
                    </div>
                  </div>
                );
              }}
            />
            <ChartLegend 
              wrapperStyle={{ paddingTop: "16px" }}
              formatter={(value) => <span className="text-sm font-medium text-foreground">{potConfig[String(value) as keyof typeof potConfig]?.label || value}</span>}
            />
            <Line type="monotone" dataKey="pensionPot" stroke="#22c55e" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="isaPot" stroke="#3b82f6" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="giaPot" stroke="#f97316" strokeWidth={2} dot={false} />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}