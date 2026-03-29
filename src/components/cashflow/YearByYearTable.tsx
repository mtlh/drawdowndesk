"use client"

import { Card, CardContent } from "@/components/ui/card"

interface CashflowYear {
  age: number
  pensionPot: number
  isaPot: number
  giaPot: number
  totalPot: number
  totalWithdrawal: number
  incomeTax: number
  takeHomePay: number
}

interface YearByYearTableProps {
  chartData: CashflowYear[]
}

export function YearByYearTable({ chartData }: YearByYearTableProps) {
  const displayData = chartData.filter((_, i) => i % 5 === 0 || i === chartData.length - 1)

  return (
    <Card className="overflow-hidden">
      <div className="px-6 py-4 border-b bg-muted/20 flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Year-by-Year Breakdown</h3>
          <p className="text-sm text-muted-foreground">Detailed projection by age</p>
        </div>
      </div>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Age</th>
                <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pension</th>
                <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">ISA</th>
                <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">GIA</th>
                <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Pot</th>
                <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Withdrawal</th>
                <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tax</th>
                <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Take Home</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {displayData.map((year) => (
                <tr key={year.age} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-3 font-medium">{year.age}</td>
                  <td className="text-right px-6 py-3">£{year.pensionPot.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                  <td className="text-right px-6 py-3">£{year.isaPot.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                  <td className="text-right px-6 py-3">£{year.giaPot.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                  <td className="text-right px-6 py-3 font-medium">£{year.totalPot.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                  <td className="text-right px-6 py-3">£{year.totalWithdrawal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                  <td className="text-right px-6 py-3 text-destructive">£{year.incomeTax.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                  <td className="text-right px-6 py-3 font-semibold text-emerald-600 dark:text-emerald-400">£{year.takeHomePay.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}