"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Calculator, PoundSterling, TrendingUp, Calendar } from "lucide-react"
import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"

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

  // Get current tax data
  const TAX_RATES = useQuery(api.getTaxYearInfo.getTaxYearInfo, {});

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

    if (!TAX_RATES || !TAX_RATES.personalAllowance || !TAX_RATES.bands) {
      return 0
    };

    // console.log(TAX_RATES.bands, taxableIncome);

    if (taxableIncome <= TAX_RATES.personalAllowance?.amount) return 0

    const taxableAmount = taxableIncome - TAX_RATES.personalAllowance.amount
    let tax = 0

    // console.log(taxableAmount, TAX_RATES.bands, TAX_RATES.personalAllowance);

    const bands = TAX_RATES.bands;
    // Basic rate
    if (taxableAmount <= bands[0].bandStartAmount) {
      tax = taxableAmount * (bands[0].taxRatePercent / 100);

    // Higher rate
    } else if (taxableAmount <= bands[1].bandStartAmount) {
      tax += bands[0].bandStartAmount * (bands[0].taxRatePercent / 100);
      tax += (taxableAmount - bands[0].bandStartAmount) * (bands[1].taxRatePercent / 100);

    // Additional rate
    } else {
      tax += bands[0].bandStartAmount * (bands[0].taxRatePercent / 100);
      tax += (bands[1].bandStartAmount - bands[0].bandStartAmount) * (bands[1].taxRatePercent / 100);
      tax += (taxableAmount - bands[1].bandStartAmount) * (bands[2].taxRatePercent / 100);
    }

    // console.log(tax);

    return tax
  }

  const calculateCapitalGainsTax = (gains: number, totalIncome: number): number => {

    if (!TAX_RATES || !TAX_RATES.capitalGainsTax || !TAX_RATES.bands) {
      return 0
    };

    // console.log(gains, TAX_RATES.capitalGainsTax);

    if (gains <= TAX_RATES.capitalGainsTax.annualExemptAmount) return 0

    const taxableGains = gains - TAX_RATES.capitalGainsTax.annualExemptAmount;

    const isHigherRateTaxpayer = totalIncome > TAX_RATES.bands[0].bandStartAmount;

    return taxableGains * (isHigherRateTaxpayer ? (TAX_RATES.capitalGainsTax.higherRatePercent / 100) : (TAX_RATES.capitalGainsTax.basicRatePercent / 100))
  }

  const calculateTax = (years: number): TaxCalculation => {
    
    if (!TAX_RATES || !TAX_RATES.personalAllowance || !TAX_RATES.bands || !TAX_RATES.capitalGainsTax) {
      return {
        totalWithdrawal: 0,
        taxableAmount: 0, // TODO: this is wrong
        incomeTax: 0, // TODO: this is wrong
        capitalGainsTax: 0, // TODO: this is wrong
        totalTax: 0, // TODO: this is wrong
        netAmount: 0, // TODO: this is wrong
      }
    };

    const {
        pension = 0,
        capitalGains = 0,
        inheritance = 0,
        currentIncome = 0,
    } = data;

    // console.log(pension, capitalGains, inheritance);
    // console.log(years);

    const pensionPerYear = pension / years;
    const capitalGainsPerYear = capitalGains / years;
    const inheritancePerYear = inheritance / years;

    const pensionTaxFree = pensionPerYear * 0.25;
    const pensionTaxable = pensionPerYear * 0.75;

    const totalIncomePerYear = currentIncome + pensionTaxable;

    const incomeTaxPerYear = calculateIncomeTax(totalIncomePerYear);

    const capitalGainsTaxPerYear = calculateCapitalGainsTax(capitalGainsPerYear, totalIncomePerYear);

    const totalIncomeTax = incomeTaxPerYear * years;
    const totalCapitalGainsTax = capitalGainsTaxPerYear * years;
    const totalTax = totalIncomeTax + totalCapitalGainsTax;

    const totalWithdrawal = pension + capitalGains + inheritance + currentIncome;
    
    const taxableAmount =
        pensionTaxable * years + Math.max(0, capitalGains - TAX_RATES.capitalGainsTax.annualExemptAmount * years);

    console.log(totalIncomeTax, totalCapitalGainsTax, totalTax, TAX_RATES, data);

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
  }, [data, TAX_RATES])

  const savings = singleYearCalc.capitalGainsTax - multiYearCalc.capitalGainsTax

  return (
    <div className="font-sans grid grid-rows-[auto_1fr_auto] min-h-screen p-8 gap-8  bg-background">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center justify-center gap-2">
            <Calculator className="h-8 w-8 text-blue-600" />
            One-off Captial Gain Calculator
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Calculate tax implications of withdrawing lump sums which are subject to capital gains tax. See how
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

                {/* <div>
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
                </div> */}

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
                  {TAX_RATES?.capitalGainsTax && TAX_RATES.capitalGainsTax.annualExemptAmount > 0 && 
                    <p className="text-sm text-gray-500 mt-1">From shares. £{TAX_RATES.capitalGainsTax.annualExemptAmount.toLocaleString()} annual allowance</p>
                  }
                </div>

                {/* <div>
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
                </div> */}

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
                      <p className="text-sm text-gray-600">Single Year CGT</p>
                      <p className="text-2xl font-bold text-red-600">£{singleYearCalc.capitalGainsTax.toLocaleString()}</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <p className="text-sm text-gray-600">{data.yearsToSpread}-Year CGT</p>
                      <p className="text-2xl font-bold text-green-600">£{multiYearCalc.capitalGainsTax.toLocaleString()}</p>
                    </div>
                  </div>

                  {savings > 0 && (
                    <div className="text-center p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                      <p className="text-sm text-gray-600">CGT Savings</p>
                      <p className="text-3xl font-bold text-blue-600">£{savings.toLocaleString()}</p>
                      <Badge variant="secondary" className="mt-2">
                        {((savings / singleYearCalc.capitalGainsTax) * 100).toFixed(1)}% reduction
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
                      {/* <div className="flex justify-between">
                        <span>Annual Pension:</span>
                        {data.pension && <span>£{(data.pension / data.yearsToSpread).toLocaleString()}</span>}
                      </div> */}
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
        {
          TAX_RATES && TAX_RATES.taxYear && TAX_RATES.personalAllowance && TAX_RATES.bands && TAX_RATES.capitalGainsTax &&
          <Card>
            <CardHeader>
              <CardTitle>UK Tax Information ({TAX_RATES.taxYear.taxYear})</CardTitle>
              <CardDescription>Current tax rates and allowances used in calculations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="gap-6">
                <div>
                  <h4 className="font-semibold mb-2">Income Tax</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Personal Allowance:</span>
                      <span>£{TAX_RATES.personalAllowance.amount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Basic Rate ({TAX_RATES.bands[0].taxRatePercent}%):</span>
                      <span>
                        £{TAX_RATES.bands[0].bandStartAmount.toLocaleString()} - £{TAX_RATES.bands[0].bandEndAmount?.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Higher Rate ({TAX_RATES.bands[1].taxRatePercent}%):</span>
                      <span>
                        £{TAX_RATES.bands[1].bandStartAmount.toLocaleString()} - £{TAX_RATES.bands[1].bandEndAmount?.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Additional Rate ({TAX_RATES.bands[2].taxRatePercent}%):</span>
                      <span>Over £{TAX_RATES.bands[2].bandStartAmount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold my-2">Capital Gains Tax</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Annual Exempt Amount:</span>
                      <span>£{TAX_RATES.capitalGainsTax.annualExemptAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Basic Rate ({TAX_RATES.capitalGainsTax.basicRatePercent}%)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Higher Rate ({TAX_RATES.capitalGainsTax.higherRatePercent}%)</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
        </Card>
        }
      </div>
    </div>
  )
}
