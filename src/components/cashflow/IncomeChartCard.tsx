"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartLegend,
} from "@/components/ui/chart"
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts"
import { PoundSterling } from "lucide-react"

interface CashflowYear {
  age: number
  takeHomePay: number
  isaWithdrawal: number
  giaWithdrawal: number
  statePension: number
  incomeTax: number
}

interface IncomeChartCardProps {
  chartData: CashflowYear[]
}

const incomeConfig = {
  takeHomePay: { label: "Pension Take Home", color: "#22c55e" },
  isaWithdrawal: { label: "ISA", color: "#3b82f6" },
  giaWithdrawal: { label: "GIA", color: "#f97316" },
  statePension: { label: "State Pension", color: "#8b5cf6" },
  incomeTax: { label: "Tax (inc NI)", color: "#ef4444" },
} satisfies ChartConfig

export function IncomeChartCard({ chartData }: IncomeChartCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <PoundSterling className="w-5 h-5 text-emerald-600" />
              Annual Income by Source
            </CardTitle>
            <CardDescription>Income from each account type</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={incomeConfig} className="h-[320px] w-full">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
              tickFormatter={(v) => `£${(v/1000).toFixed(0)}k`} 
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
                          {incomeConfig[String(entry.dataKey) as keyof typeof incomeConfig]?.label || String(entry.dataKey)}
                        </span>
                        <span className="font-medium">£{(entry.value ?? 0).toLocaleString("en-US", { minimumFractionDigits: 0 })}</span>
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
              formatter={(value) => <span className="text-sm font-medium text-foreground">{incomeConfig[String(value) as keyof typeof incomeConfig]?.label || value}</span>}
            />
            <Bar dataKey="takeHomePay" stackId="a" fill="#22c55e" radius={[0, 0, 2, 2]} />
            <Bar dataKey="isaWithdrawal" stackId="a" fill="#3b82f6" />
            <Bar dataKey="giaWithdrawal" stackId="a" fill="#f97316" />
            <Bar dataKey="statePension" stackId="a" fill="#8b5cf6" />
            <Bar dataKey="incomeTax" stackId="a" fill="#ef4444" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}