"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface RetirementSettingsCardProps {
  startAge: number
  statePension: number
  statePensionAge: number
  growthRate: number
  withdrawalRate: number
  onStartAgeChange: (value: number) => void
  onGrowthRateChange: (value: number) => void
  onWithdrawalRateChange: (value: number) => void
}

export function RetirementSettingsCard({
  startAge,
  statePension,
  statePensionAge,
  growthRate,
  withdrawalRate,
  onStartAgeChange,
  onGrowthRateChange,
  onWithdrawalRateChange,
}: RetirementSettingsCardProps) {
  return (
    <Card className="overflow-hidden">
      <div className="px-6 py-4 border-b bg-muted/20 flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Retirement Settings</h3>
          <p className="text-sm text-muted-foreground">Configure your retirement timeline and assumptions</p>
        </div>
      </div>
      <CardContent className="p-6">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-3">
            <Label htmlFor="startAge" className="font-medium">Retirement Start Age</Label>
            <Input
              id="startAge"
              type="number"
              min={18}
              max={80}
              value={startAge}
              onChange={(e) => onStartAgeChange(Number(e.target.value))}
              className="h-11"
            />
          </div>

          <div className="space-y-3">
            <Label className="font-medium">State Pension</Label>
            <div className="p-4 bg-gradient-to-r from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20 border border-purple-200/50 dark:border-purple-800/50 rounded-xl">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold text-lg">£{statePension.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Age {statePensionAge}</p>
                </div>
                <a
                  href="/settings"
                  className="text-sm text-purple-600 hover:text-purple-800 hover:underline font-medium"
                >
                  Edit
                </a>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Label htmlFor="growthRate" className="font-medium">Annual Growth Rate</Label>
            <Select value={growthRate.toString()} onValueChange={(v) => onGrowthRateChange(Number(v))}>
              <SelectTrigger className="h-11" aria-label="Select growth rate">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((rate) => (
                  <SelectItem key={rate} value={rate.toString()}>
                    {rate}%
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label htmlFor="withdrawalRate" className="font-medium">Annual Withdrawal Rate</Label>
            <Select value={withdrawalRate.toString()} onValueChange={(v) => onWithdrawalRateChange(Number(v))}>
              <SelectTrigger className="h-11" aria-label="Select withdrawal rate">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rate) => (
                  <SelectItem key={rate} value={rate.toString()}>
                    {rate}%
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}