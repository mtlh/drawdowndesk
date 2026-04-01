"use client"

import { useState, useMemo } from "react"
import { useQuery, useMutation } from "convex/react"
import { AuthRequired } from "@/hooks/useRequireAuth"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { CreateTakeHome, TaxInfo } from "@/lib/createTakeHome"
import { CURRENT_TAX_YEAR } from "@/lib/constants"
import { Skeleton, SkeletonCard, SkeletonCardHeader, SkeletonCardContent, SkeletonChart, SkeletonText } from "@/components/ui/skeleton"
import { AlertCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  CashflowHeader,
  SaveScenarioCard,
  AccountInputsCard,
  RetirementSettingsCard,
  IncomeChartCard,
  PotValueChartCard,
  YearByYearTable,
  AssumptionsCard,
} from "@/components/cashflow"

type AccountType = "pension" | "isa" | "gia"

interface Account {
  type: AccountType
  value: number
  name: string
  icon: React.ReactNode
  color: string
  description: string
}

interface CashflowYear {
  age: number
  pensionPot: number
  isaPot: number
  giaPot: number
  totalPot: number
  pensionWithdrawal: number
  isaWithdrawal: number
  giaWithdrawal: number
  totalWithdrawal: number
  statePension: number
  pensionTaxFree: number
  pensionTaxed: number
  grossIncome: number
  incomeTax: number
  nationalInsurance: number
  takeHomePay: number
}

interface SummaryMetrics {
  totalWithdrawals: number
  totalTax: number
  totalTakeHome: number
  yearsUntilDepleted: number
  finalTotalValue: number
  pensionTotal: number
  isaTotal: number
  giaTotal: number
}

const useCashflowCalculation = (
  accounts: Account[],
  annualGrowthRate: number,
  withdrawalRate: number,
  startAge: number,
  statePension: number,
  statePensionAge: number,
  taxInfo: TaxInfo
) => {
  return useMemo((): { chartData: CashflowYear[]; summary: SummaryMetrics } => {
    const endAge = 100

    let pensionPot = accounts.find(a => a.type === "pension")?.value || 0
    let isaPot = accounts.find(a => a.type === "isa")?.value || 0
    let giaPot = accounts.find(a => a.type === "gia")?.value || 0

    const years: CashflowYear[] = []
    let yearsUntilDepleted = endAge - startAge
    let finalTotalValue = 0

    for (let age = startAge; age <= endAge; age++) {
      const pensionGrowth = pensionPot * annualGrowthRate
      const isaGrowth = isaPot * annualGrowthRate
      const giaGrowth = giaPot * annualGrowthRate

      pensionPot += pensionGrowth
      isaPot += isaGrowth
      giaPot += giaGrowth

      const currentStatePension = age >= statePensionAge ? statePension : 0

      const totalPot = pensionPot + isaPot + giaPot
      const withdrawal = totalPot > 0 ? Math.min(totalPot * withdrawalRate, totalPot) : 0

      let pensionWithdrawal = 0
      let isaWithdrawal = 0
      let giaWithdrawal = 0

      if (withdrawal > 0 && totalPot > 0) {
        const ratio = withdrawal / totalPot
        pensionWithdrawal = pensionPot * ratio
        isaWithdrawal = isaPot * ratio
        giaWithdrawal = giaPot * ratio
      }

      pensionPot -= pensionWithdrawal
      isaPot -= isaWithdrawal
      giaPot -= giaWithdrawal

      pensionPot = Math.max(0, pensionPot)
      isaPot = Math.max(0, isaPot)
      giaPot = Math.max(0, giaPot)

      const pensionTaxFree = pensionWithdrawal * 0.25
      const pensionTaxed = pensionWithdrawal * 0.75

      const isaTaxFree = isaWithdrawal

      const giaTaxable = giaWithdrawal

      const totalTaxableIncome = pensionTaxed + giaTaxable + currentStatePension

      const taxResult = CreateTakeHome(taxInfo, totalTaxableIncome)
      const hasError = 'error' in taxResult && taxResult.error

      const incomeTax = hasError ? 0 : (taxResult as { incomeTax: number }).incomeTax
      const nationalInsurance = hasError ? 0 : (taxResult as { nationalInsurance: number }).nationalInsurance

      let pensionIncomeTax = 0
      let giaIncomeTax = 0
      if (totalTaxableIncome > 0) {
        pensionIncomeTax = pensionTaxed > 0 ? (pensionTaxed / totalTaxableIncome) * incomeTax : 0
        giaIncomeTax = giaTaxable > 0 ? (giaTaxable / totalTaxableIncome) * incomeTax : 0
      }

      const pensionTakeHome = pensionTaxFree + (pensionTaxed - pensionIncomeTax)
      const isaTakeHome = isaTaxFree
      const giaTakeHome = giaTaxable - giaIncomeTax
      const statePensionTakeHome = currentStatePension - (currentStatePension > 0 ? ((currentStatePension / totalTaxableIncome) * incomeTax || 0) : 0)

      const totalTakeHome = pensionTakeHome + isaTakeHome + giaTakeHome + statePensionTakeHome

      const currentTotalPot = pensionPot + isaPot + giaPot
      if (currentTotalPot <= 0 && yearsUntilDepleted === endAge - startAge) {
        yearsUntilDepleted = age - startAge
      }

      finalTotalValue = currentTotalPot

      years.push({
        age,
        pensionPot,
        isaPot,
        giaPot,
        totalPot: currentTotalPot,
        pensionWithdrawal,
        isaWithdrawal,
        giaWithdrawal,
        totalWithdrawal: pensionWithdrawal + isaWithdrawal + giaWithdrawal,
        statePension: currentStatePension,
        pensionTaxFree,
        pensionTaxed,
        grossIncome: pensionWithdrawal + isaWithdrawal + giaWithdrawal + currentStatePension,
        incomeTax: pensionIncomeTax + giaIncomeTax + (totalTaxableIncome > 0 ? (currentStatePension / totalTaxableIncome) * incomeTax : 0) + nationalInsurance,
        nationalInsurance,
        takeHomePay: totalTakeHome,
      })
    }

    const summary: SummaryMetrics = {
      totalWithdrawals: years.reduce((sum, y) => sum + y.totalWithdrawal, 0),
      totalTax: years.reduce((sum, y) => sum + y.incomeTax + y.nationalInsurance, 0),
      totalTakeHome: years.reduce((sum, y) => sum + y.takeHomePay, 0),
      yearsUntilDepleted: yearsUntilDepleted === endAge - startAge && finalTotalValue > 0
        ? endAge - startAge + 1
        : yearsUntilDepleted,
      finalTotalValue,
      pensionTotal: years.reduce((sum, y) => sum + y.pensionWithdrawal, 0),
      isaTotal: years.reduce((sum, y) => sum + y.isaWithdrawal, 0),
      giaTotal: years.reduce((sum, y) => sum + y.giaWithdrawal, 0),
    }

    return { chartData: years, summary }
  }, [accounts, annualGrowthRate, withdrawalRate, startAge, statePension, statePensionAge, taxInfo])
}

type CurrentUserResult = { _id: string } | null

function useCurrentUserQuery(): CurrentUserResult | undefined {
  return useQuery(api.currentUser.getCurrentUser.getCurrentUser)
}

function useTaxInfoQuery(userId: string | undefined): TaxInfo {
  return useQuery(api.tax.runTaxQuery.getTaxInfoForIncome, {
    taxYear: CURRENT_TAX_YEAR,
    userId: userId as Id<"users"> | undefined
  }) as TaxInfo
}

type UserSettings = {
  statePensionAmount: number
  statePensionAge: number
  defaultGrowthRate: number
  defaultInflationRate: number
}

function useUserSettingsQuery(userId: string | undefined): UserSettings | undefined {
  return useQuery(
    api.tax.userSettings.getUserSettings,
    userId ? { userId: userId as Id<"users"> } : "skip"
  ) as UserSettings | undefined
}

export default function RetirementCashflowCalculator() {
  const user = useCurrentUserQuery()
  const taxBandInformation = useTaxInfoQuery(user?._id)
  const userSettings = useUserSettingsQuery(user?._id)
  const createScenario = useMutation(api.scenarios.scenarioCrud.createScenario)

  const [pensionValue, setPensionValue] = useState(500000)
  const [isaValue, setIsaValue] = useState(100000)
  const [giaValue, setGiaValue] = useState(100000)
  const [growthRate, setGrowthRate] = useState(() => userSettings?.defaultGrowthRate ?? 5)
  const [withdrawalRate, setWithdrawalRate] = useState(3)
  const [statePension] = useState(() => userSettings?.statePensionAmount ?? 11000)
  const [statePensionAge] = useState(() => userSettings?.statePensionAge ?? 67)
  const [startAge, setStartAge] = useState(55)

  const accounts = useMemo((): Account[] => [
    { type: "pension", value: pensionValue, name: "Pension", icon: null, color: "var(--chart-1)", description: "25% tax-free, rest taxed as income" },
    { type: "isa", value: isaValue, name: "ISA", icon: null, color: "var(--chart-2)", description: "Completely tax-free" },
    { type: "gia", value: giaValue, name: "GIA", icon: null, color: "var(--chart-4)", description: "Taxed on gains within income brackets" },
  ], [pensionValue, isaValue, giaValue])

  const totalPortfolio = pensionValue + isaValue + giaValue

  const { chartData, summary } = useCashflowCalculation(
    accounts,
    growthRate / 100,
    withdrawalRate / 100,
    startAge,
    statePension,
    statePensionAge,
    taxBandInformation
  )

  if (!taxBandInformation || !userSettings) {
    return (
      <div className="flex min-h-screen bg-background">
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-background pr-4">
          <div className="p-4 lg:p-8 space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-2">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-96" />
              </div>
              <div className="flex gap-3">
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-10 w-32" />
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonCard key={i} className="h-[100px] p-6" />
              ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <SkeletonCard className="h-[350px] p-6">
                <SkeletonCardHeader className="pb-2">
                  <SkeletonText lines={2} />
                </SkeletonCardHeader>
                <SkeletonCardContent>
                  <SkeletonChart className="h-[250px]" />
                </SkeletonCardContent>
              </SkeletonCard>
              <SkeletonCard className="h-[350px] p-6">
                <SkeletonCardHeader className="pb-2">
                  <SkeletonText lines={2} />
                </SkeletonCardHeader>
                <SkeletonCardContent>
                  <SkeletonChart className="h-[250px]" />
                </SkeletonCardContent>
              </SkeletonCard>
            </div>

            <SkeletonCard className="h-[400px] p-6">
              <SkeletonCardHeader className="pb-2">
                <SkeletonText lines={2} />
              </SkeletonCardHeader>
              <SkeletonCardContent>
                <SkeletonChart className="h-[300px]" />
              </SkeletonCardContent>
            </SkeletonCard>
          </div>
        </main>
      </div>
    )
  }

  if (taxBandInformation && 'error' in taxBandInformation && taxBandInformation.error) {
    return (
      <div className="flex min-h-screen bg-background items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Error Loading Tax Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{taxBandInformation.error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleSaveScenario = async (name: string, description: string) => {
    await createScenario({
      name,
      description: description || undefined,
      pensionValue,
      isaValue,
      giaValue,
      growthRate,
      withdrawalRate,
      startAge,
      statePension,
      statePensionAge,
    })
  }

  return (
    <AuthRequired>
    <div className="flex min-h-screen bg-background">
      <main className="flex-1 overflow-y-auto overflow-x-hidden bg-background pr-4">
        <div className="p-4 lg:p-8 space-y-6">
          <CashflowHeader
            totalPortfolio={totalPortfolio}
            startAge={startAge}
            summary={summary}
          />

          <SaveScenarioCard
            pensionValue={pensionValue}
            isaValue={isaValue}
            giaValue={giaValue}
            startAge={startAge}
            growthRate={growthRate}
            withdrawalRate={withdrawalRate}
            onSave={handleSaveScenario}
          />

          <AccountInputsCard
            pensionValue={pensionValue}
            isaValue={isaValue}
            giaValue={giaValue}
            totalPortfolio={totalPortfolio}
            onPensionChange={setPensionValue}
            onIsaChange={setIsaValue}
            onGiaChange={setGiaValue}
          />

          <RetirementSettingsCard
            startAge={startAge}
            statePension={statePension}
            statePensionAge={statePensionAge}
            growthRate={growthRate}
            withdrawalRate={withdrawalRate}
            onStartAgeChange={setStartAge}
            onGrowthRateChange={setGrowthRate}
            onWithdrawalRateChange={setWithdrawalRate}
          />

          <div className="grid md:grid-cols-2 gap-6">
            <IncomeChartCard chartData={chartData} />
            <PotValueChartCard chartData={chartData} />
          </div>

          <YearByYearTable chartData={chartData} />

          <AssumptionsCard />
        </div>
      </main>
    </div>
    </AuthRequired>
  )
}
