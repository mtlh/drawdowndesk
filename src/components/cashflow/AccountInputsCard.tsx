"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Building2, PiggyBank, Wallet } from "lucide-react"

interface AccountInputsCardProps {
  pensionValue: number
  isaValue: number
  giaValue: number
  totalPortfolio: number
  onPensionChange: (value: number) => void
  onIsaChange: (value: number) => void
  onGiaChange: (value: number) => void
}

export function AccountInputsCard({
  pensionValue,
  isaValue,
  giaValue,
  totalPortfolio,
  onPensionChange,
  onIsaChange,
  onGiaChange,
}: AccountInputsCardProps) {
  return (
    <Card className="overflow-hidden">
      <div className="px-6 py-4 border-b bg-muted/20 flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Account Balances</h3>
          <p className="text-sm text-muted-foreground">Enter the value of each account type</p>
        </div>
      </div>
      <CardContent className="p-6">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="space-y-3">
            <Label htmlFor="pensionValue" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" style={{ color: "#22c55e" }} />
              <span className="font-medium">Pension Pot</span>
            </Label>
            <Input
              id="pensionValue"
              type="number"
              step="10000"
              value={pensionValue}
              onChange={(e) => onPensionChange(Number(e.target.value))}
              className="text-lg h-11"
            />
            <p className="text-xs text-muted-foreground">25% tax-free, rest taxed as income</p>
          </div>

          <div className="space-y-3">
            <Label htmlFor="isaValue" className="flex items-center gap-2">
              <PiggyBank className="h-4 w-4" style={{ color: "#3b82f6" }} />
              <span className="font-medium">ISA Value</span>
            </Label>
            <Input
              id="isaValue"
              type="number"
              step="10000"
              value={isaValue}
              onChange={(e) => onIsaChange(Number(e.target.value))}
              className="text-lg h-11"
            />
            <p className="text-xs text-muted-foreground">Completely tax-free withdrawals</p>
          </div>

          <div className="space-y-3">
            <Label htmlFor="giaValue" className="flex items-center gap-2">
              <Wallet className="h-4 w-4" style={{ color: "#f97316" }} />
              <span className="font-medium">GIA Value</span>
            </Label>
            <Input
              id="giaValue"
              type="number"
              step="10000"
              value={giaValue}
              onChange={(e) => onGiaChange(Number(e.target.value))}
              className="text-lg h-11"
            />
            <p className="text-xs text-muted-foreground">Taxed on gains within income brackets</p>
          </div>
        </div>

        <div className="mt-6 p-4 bg-gradient-to-r from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 border border-emerald-200/50 dark:border-emerald-800/50 rounded-xl">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Total Portfolio</span>
            <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">£{totalPortfolio.toLocaleString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}