"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Calculator, PoundSterling, TrendingUp, Calendar } from "lucide-react"

// UK Tax rates for 2023-24
const TAX_RATES = {
  personalAllowance: 12570,
  basicRate: 0.2,
  basicRateThreshold: 50270,
  higherRate: 0.4,
  higherRateThreshold: 125140,
  additionalRate: 0.45,
  capitalGainsAllowance: 6000,
  capitalGainsBasicRate: 0.1,
  capitalGainsHigherRate: 0.2,
}

interface WithdrawalData {
  pension: number | undefined
  capitalGains: number | undefined
  inheritance: number | undefined
  currentIncome: number | undefined
  yearsToSpread: number
}

interface TaxCalculation {
  totalWithdrawal: number
  taxableAmount: number
  incomeTax: number
  capitalGainsTax: number
  totalTax: number
  netAmount: number
}

export default function OneOffCashflow() {
  const [data, setData] = useState<WithdrawalData>({
    pension: 0,
    capitalGains: 0,
    inheritance: 0,
    currentIncome: 30000,
    yearsToSpread: 3,
  })

  const [singleYearCalc, setSingleYearCalc] = useState<TaxCalculation>({
    totalWithdrawal: 0,
    taxableAmount: 0,
    incomeTax: 0,
    capitalGainsTax: 0,
    totalTax: 0,
    netAmount: 0,
  })

  const [multiYearCalc, setMultiYearCalc] = useState<TaxCalculation>({
    totalWithdrawal: 0,
    taxableAmount: 0,
    incomeTax: 0,
    capitalGainsTax: 0,
    totalTax: 0,
    netAmount: 0,
  })

  const calculateIncomeTax = (taxableIncome: number): number => {
    if (taxableIncome <= TAX_RATES.personalAllowance) return 0

    const taxableAmount = taxableIncome - TAX_RATES.personalAllowance
    let tax = 0

    if (taxableAmount <= TAX_RATES.basicRateThreshold - TAX_RATES.personalAllowance) {
      tax = taxableAmount * TAX_RATES.basicRate
    } else if (taxableAmount <= TAX_RATES.higherRateThreshold - TAX_RATES.personalAllowance) {
      tax = (TAX_RATES.basicRateThreshold - TAX_RATES.personalAllowance) * TAX_RATES.basicRate
      tax += (taxableAmount - (TAX_RATES.basicRateThreshold - TAX_RATES.personalAllowance)) * TAX_RATES.higherRate
    } else {
      tax = (TAX_RATES.basicRateThreshold - TAX_RATES.personalAllowance) * TAX_RATES.basicRate
      tax += (TAX_RATES.higherRateThreshold - TAX_RATES.basicRateThreshold) * TAX_RATES.higherRate
      tax += (taxableAmount - (TAX_RATES.higherRateThreshold - TAX_RATES.personalAllowance)) * TAX_RATES.additionalRate
    }

    return tax
  }

  const calculateCapitalGainsTax = (gains: number, totalIncome: number): number => {
    if (gains <= TAX_RATES.capitalGainsAllowance) return 0

    const taxableGains = gains - TAX_RATES.capitalGainsAllowance
    const isHigherRateTaxpayer = totalIncome > TAX_RATES.basicRateThreshold

    return taxableGains * (isHigherRateTaxpayer ? TAX_RATES.capitalGainsHigherRate : TAX_RATES.capitalGainsBasicRate)
  }

  const calculateTax = (years: number): TaxCalculation => {
    const {
        pension = 0,
        capitalGains = 0,
        inheritance = 0,
        currentIncome = 0,
    } = data;

    console.log(pension, capitalGains, inheritance);
    console.log(years);

    const pensionPerYear = pension / years;
    const capitalGainsPerYear = capitalGains / years;
    const inheritancePerYear = inheritance / years;

    const pensionTaxFree = pensionPerYear * 0.25;
    const pensionTaxable = pensionPerYear * 0.75;

    const totalIncomePerYear = currentIncome + pensionTaxable;

    let incomeTaxPerYear = calculateIncomeTax(totalIncomePerYear);
    if (currentIncome > 0) {
        incomeTaxPerYear -= calculateIncomeTax(currentIncome);
    }

    const capitalGainsTaxPerYear = calculateCapitalGainsTax(capitalGainsPerYear, totalIncomePerYear);

    const totalIncomeTax = incomeTaxPerYear * years;
    const totalCapitalGainsTax = capitalGainsTaxPerYear * years;
    const totalTax = totalIncomeTax + totalCapitalGainsTax;

    const totalWithdrawal = pension + capitalGains + inheritance;
    const taxableAmount =
        pensionTaxable * years + Math.max(0, capitalGains - TAX_RATES.capitalGainsAllowance * years);

    console.log(totalIncomeTax, totalCapitalGainsTax, totalTax);

    return {
            totalWithdrawal,
            taxableAmount,
            incomeTax: totalIncomeTax,
            capitalGainsTax: totalCapitalGainsTax,
            totalTax,
            netAmount: totalWithdrawal - totalTax,
        };
    };

  useEffect(() => {
    setSingleYearCalc(calculateTax(1))
    setMultiYearCalc(calculateTax(data.yearsToSpread))
  }, [data])

  const savings = singleYearCalc.totalTax - multiYearCalc.totalTax

  return (
    <div className="font-sans grid grid-rows-[auto_1fr_auto] min-h-screen p-8 gap-8  bg-background">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center justify-center gap-2">
            <Calculator className="h-8 w-8 text-blue-600" />
            One-off Cashflow  Calculator
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Calculate tax implications of withdrawing lump sums from pensions, capital gains, and inheritance. See how
            spreading over several years can reduce your overall tax burden.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Input Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PoundSterling className="h-5 w-5" />
                Withdrawal Details
              </CardTitle>
              <CardDescription>Enter your withdrawal amounts and current financial situation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="currentIncome">Current Annual Income (£)</Label>
                  <Input
                    id="currentIncome"
                    type="number"
                    value={data.currentIncome}
                    placeholder="Please enter a value"
                    className="w-full p-2 border rounded-md bg-card my-2"
                    onChange={(e) => {
                        const value = e.target.value;
                        setData({ ...data, currentIncome: value === "" ? undefined : Number(value) });
                    }}
                  />
                </div>

                <Separator />

                <div>
                  <Label htmlFor="pension">Pension Withdrawal (£)</Label>
                  <Input
                    id="pension"
                    type="number"
                    value={data.pension}
                    placeholder="Please enter a value"
                    className="w-full p-2 border rounded-md bg-card my-2"
                    onChange={(e) => {
                        const value = e.target.value;
                        setData({ ...data, pension: value === "" ? undefined : Number(value) });
                    }}
                  />
                  <p className="text-sm text-gray-500 mt-1">25% tax-free, 75% taxed as income</p>
                </div>

                <div>
                  <Label htmlFor="capitalGains">Capital Gains (£)</Label>
                  <Input
                    id="capitalGains"
                    type="number"
                    value={data.capitalGains}
                    placeholder="Please enter a value"
                    className="w-full p-2 border rounded-md bg-card my-2"
                    onChange={(e) => {
                        const value = e.target.value;
                        setData({ ...data, capitalGains: value === "" ? undefined : Number(value) });
                    }}
                  />
                  <p className="text-sm text-gray-500 mt-1">From shares, property, etc. £6,000 annual allowance</p>
                </div>

                <div>
                  <Label htmlFor="inheritance">Inheritance (£)</Label>
                  <Input
                    id="inheritance"
                    type="number"
                    value={data.inheritance}
                    placeholder="Please enter a value"
                    onChange={(e) => {
                        const value = e.target.value;
                        setData({ ...data, inheritance: value === "" ? undefined : Number(value) });
                    }}
                  />
                  <p className="text-sm text-gray-500 mt-1">Usually tax-free for beneficiaries</p>
                </div>

                <Separator />

                <div>
                  <Label htmlFor="years">Spread Over Years</Label>
                  <Select
                    value={data.yearsToSpread.toString()}
                    onValueChange={(value) => setData({ ...data, yearsToSpread: Number(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year} {year === 1 ? "Year" : "Years"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
            </CardContent>
          </Card>

          {/* Results Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Tax Calculation Results
              </CardTitle>
              <CardDescription>Compare single year vs multi-year withdrawal strategies</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="comparison" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="comparison">Comparison</TabsTrigger>
                  <TabsTrigger value="single">Single Year</TabsTrigger>
                  <TabsTrigger value="multi">Multi-Year</TabsTrigger>
                </TabsList>

                <TabsContent value="comparison" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                      <p className="text-sm text-gray-600">Single Year Tax</p>
                      <p className="text-2xl font-bold text-red-600">£{singleYearCalc.totalTax.toLocaleString()}</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <p className="text-sm text-gray-600">{data.yearsToSpread}-Year Tax</p>
                      <p className="text-2xl font-bold text-green-600">£{multiYearCalc.totalTax.toLocaleString()}</p>
                    </div>
                  </div>

                  {savings > 0 && (
                    <div className="text-center p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                      <p className="text-sm text-gray-600">Tax Savings</p>
                      <p className="text-3xl font-bold text-blue-600">£{savings.toLocaleString()}</p>
                      <Badge variant="secondary" className="mt-2">
                        {((savings / singleYearCalc.totalTax) * 100).toFixed(1)}% reduction
                      </Badge>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Total Withdrawal:</span>
                      <span className="font-semibold">£{singleYearCalc.totalWithdrawal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Net Amount (Single Year):</span>
                      <span className="font-semibold text-red-600">£{singleYearCalc.netAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Net Amount ({data.yearsToSpread} Years):</span>
                      <span className="font-semibold text-green-600">£{multiYearCalc.netAmount.toLocaleString()}</span>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="single" className="space-y-4">
                  <div className="space-y-3">
                    <h4 className="font-semibold">Single Year Withdrawal</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Total Withdrawal:</span>
                        <span>£{singleYearCalc.totalWithdrawal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Income Tax:</span>
                        <span>£{singleYearCalc.incomeTax.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Capital Gains Tax:</span>
                        <span>£{singleYearCalc.capitalGainsTax.toLocaleString()}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-semibold">
                        <span>Total Tax:</span>
                        <span className="text-red-600">£{singleYearCalc.totalTax.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-semibold">
                        <span>Net Amount:</span>
                        <span className="text-green-600">£{singleYearCalc.netAmount.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="multi" className="space-y-4">
                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {data.yearsToSpread}-Year Strategy
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Total Withdrawal:</span>
                        <span>£{multiYearCalc.totalWithdrawal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Annual Pension:</span>
                        {data.pension && <span>£{(data.pension / data.yearsToSpread).toLocaleString()}</span>}
                      </div>
                      <div className="flex justify-between">
                        <span>Annual Capital Gains:</span>
                        {data.capitalGains && <span>£{(data.capitalGains / data.yearsToSpread).toLocaleString()}</span>}
                      </div>
                      <Separator />
                      <div className="flex justify-between">
                        <span>Total Income Tax:</span>
                        <span>£{multiYearCalc.incomeTax.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total CGT:</span>
                        <span>£{multiYearCalc.capitalGainsTax.toLocaleString()}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-semibold">
                        <span>Total Tax:</span>
                        <span className="text-red-600">£{multiYearCalc.totalTax.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-semibold">
                        <span>Net Amount:</span>
                        <span className="text-green-600">£{multiYearCalc.netAmount.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Tax Information */}
        <Card>
          <CardHeader>
            <CardTitle>UK Tax Information (2023-24)</CardTitle>
            <CardDescription>Current tax rates and allowances used in calculations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-2">Income Tax</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Personal Allowance:</span>
                    <span>£{TAX_RATES.personalAllowance.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Basic Rate (20%):</span>
                    <span>
                      £{TAX_RATES.personalAllowance.toLocaleString()} - £{TAX_RATES.basicRateThreshold.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Higher Rate (40%):</span>
                    <span>
                      £{TAX_RATES.basicRateThreshold.toLocaleString()} - £
                      {TAX_RATES.higherRateThreshold.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Additional Rate (45%):</span>
                    <span>Over £{TAX_RATES.higherRateThreshold.toLocaleString()}</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Capital Gains Tax</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Annual Allowance:</span>
                    <span>£{TAX_RATES.capitalGainsAllowance.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Basic Rate:</span>
                    <span>{TAX_RATES.capitalGainsBasicRate * 100}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Higher Rate:</span>
                    <span>{TAX_RATES.capitalGainsHigherRate * 100}%</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
