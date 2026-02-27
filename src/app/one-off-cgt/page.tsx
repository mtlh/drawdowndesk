"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Calculator, TrendingUp, Calendar, Info } from "lucide-react"
import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import {
  calculateIncomeTax,
  calculateCapitalGainsTax,
  type TaxRates,
} from "@/lib/taxCalculations"

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

type TaxRatesData = (TaxRates & { taxYear: { taxYear: number } }) | { error: string } | undefined;


export default function OneOffCashflow() {
  // Get current tax data
  const TAX_RATES = useQuery(api.tax.runTaxQuery.getTaxInfoForIncome, { taxYear: 2025 }) as TaxRatesData;
  const isLoading = TAX_RATES === undefined;

  const [data, setData] = useState<WithdrawalData>({
    pension: 0,
    capitalGains: 100000,
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


  useEffect(() => {
    const calculateTax = (years: number): TaxCalculation => {

      if (!TAX_RATES || "error" in TAX_RATES || !TAX_RATES.personalAllowance || !TAX_RATES.bands || !TAX_RATES.capitalGainsTax) {
        return {
          totalWithdrawal: 0,
          taxableAmount: 0,
          incomeTax: 0,
          capitalGainsTax: 0,
          totalTax: 0,
          netAmount: 0,
        }
      };

      const {
          pension = 0,
          capitalGains = 0,
          inheritance = 0,
          currentIncome = 0,
      } = data;

      const pensionPerYear = pension / years;
      const capitalGainsPerYear = capitalGains / years;

      const pensionTaxable = pensionPerYear * 0.75;

      const totalIncomePerYear = currentIncome + pensionTaxable;

      const incomeTaxPerYear = calculateIncomeTax(totalIncomePerYear, TAX_RATES as TaxRates);

      const capitalGainsTaxPerYear = calculateCapitalGainsTax(capitalGainsPerYear, totalIncomePerYear, TAX_RATES as TaxRates);

      const totalIncomeTax = incomeTaxPerYear * years;
      const totalCapitalGainsTax = capitalGainsTaxPerYear * years;
      const totalTax = totalIncomeTax + totalCapitalGainsTax;

      const totalWithdrawal = pension + capitalGains + inheritance + currentIncome;

      const taxableAmount =
          pensionTaxable * years + Math.max(0, capitalGains - (TAX_RATES as TaxRates).capitalGainsTax.annualExemptAmount * years);

      return {
              totalWithdrawal,
              taxableAmount,
              incomeTax: totalIncomeTax,
              capitalGainsTax: totalCapitalGainsTax,
              totalTax,
              netAmount: totalWithdrawal - totalTax,
          };
      };

    setSingleYearCalc(calculateTax(1))
    setMultiYearCalc(calculateTax(data.yearsToSpread))
  }, [data, TAX_RATES])

  const savings = singleYearCalc.capitalGainsTax - multiYearCalc.capitalGainsTax

  let singleyearcapitalGainsBreakdown = null;

  if (data.capitalGains &&
    data.currentIncome &&
    TAX_RATES &&
    !('error' in TAX_RATES) &&
    TAX_RATES.capitalGainsTax?.annualExemptAmount &&
    TAX_RATES.bands?.[0].bandEndAmount) {

    const taxableGains = data.capitalGains - TAX_RATES.capitalGainsTax.annualExemptAmount;
    if (taxableGains > 0) {
      const basicBandEnd = TAX_RATES.bands[0].bandEndAmount;
      const remainingBasicBand = Math.max(0, basicBandEnd - data.currentIncome);

      const basicRateGains = Math.min(taxableGains, remainingBasicBand);
      const higherRateGains = taxableGains - basicRateGains;

      singleyearcapitalGainsBreakdown = (
        <>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Basic rate ({TAX_RATES.capitalGainsTax.basicRatePercent}%):</span>
            <span>£{basicRateGains.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Higher rate ({TAX_RATES.capitalGainsTax.higherRatePercent}%):</span>
            <span>£{higherRateGains.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </div>
        </>
      );
    }
  }

  let multicapitalGainsBreakdown = null;

  if (data.capitalGains &&
    data.currentIncome &&
    TAX_RATES &&
    !('error' in TAX_RATES) &&
    TAX_RATES.capitalGainsTax?.annualExemptAmount &&
    TAX_RATES.bands?.[0].bandEndAmount) {

    const annualGains = data.capitalGains / data.yearsToSpread;
    const taxableGains = annualGains - TAX_RATES.capitalGainsTax.annualExemptAmount;

    if (taxableGains > 0) {
      const basicBandEnd = TAX_RATES.bands[0].bandEndAmount;
      const remainingBasicBand = Math.max(0, basicBandEnd - data.currentIncome);

      const basicRateGains = Math.min(taxableGains, remainingBasicBand);
      const higherRateGains = taxableGains - basicRateGains;

      multicapitalGainsBreakdown = (
        <>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Basic rate ({TAX_RATES.capitalGainsTax.basicRatePercent}%):</span>
            <span>
              £{(basicRateGains * data.yearsToSpread).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Higher rate ({TAX_RATES.capitalGainsTax.higherRatePercent}%):</span>
            <span>
              £{(higherRateGains * data.yearsToSpread).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>
        </>
      );
    } else {
      multicapitalGainsBreakdown = <span className="text-sm text-muted-foreground">No taxable gains</span>;
    }
  }

  return (
    <div className="flex h-screen bg-background">
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 space-y-8">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Calculator className="h-8 w-8 text-primary" />
              One-off Capital Gain Calculator
            </h1>
            <p className="text-muted-foreground max-w-2xl">
              Calculate tax implications of withdrawing lump sums which are subject to capital gains tax.
              See how spreading over several years can reduce your overall tax burden.
            </p>
          </div>

          {/* Main Content - Vertical Stack */}
          <div className="space-y-6">
            {/* Input Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Withdrawal Details
                </CardTitle>
                <CardDescription>Enter your financial details to calculate tax</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6">
                  <div>
                    <Label htmlFor="currentIncome">Current Annual Income (£)</Label>
                    <Input
                      id="currentIncome"
                      type="number"
                      value={data.currentIncome}
                      placeholder="e.g. 30000"
                      className="mt-2"
                      onChange={(e) => {
                          const value = e.target.value;
                          setData({ ...data, currentIncome: value === "" ? undefined : Number(value) });
                      }}
                    />
                  </div>

                  <div>
                    <Label htmlFor="capitalGains">Capital Gains (£)</Label>
                    <Input
                      id="capitalGains"
                      type="number"
                      value={data.capitalGains}
                      placeholder="e.g. 100000"
                      className="mt-2"
                      onChange={(e) => {
                          const value = e.target.value;
                          setData({ ...data, capitalGains: value === "" ? undefined : Number(value) });
                      }}
                    />
                    {TAX_RATES && !('error' in TAX_RATES) && TAX_RATES.capitalGainsTax && TAX_RATES.capitalGainsTax.annualExemptAmount > 0 &&
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Info className="h-3 w-3" />
                        £{TAX_RATES.capitalGainsTax.annualExemptAmount.toLocaleString()} allowance
                      </p>
                    }
                  </div>

                  <div>
                    <Label>Spread Over Years</Label>
                    <div className="flex gap-1 mt-2">
                      {[1, 2, 3, 4, 5].map((year) => (
                        <Button
                          key={year}
                          variant={data.yearsToSpread === year ? "default" : "outline"}
                          size="sm"
                          className="flex-1"
                          onClick={() => setData({ ...data, yearsToSpread: year })}
                        >
                          {year}
                        </Button>
                      ))}
                      <Select
                        value={data.yearsToSpread.toString()}
                        onValueChange={(value) => setData({ ...data, yearsToSpread: Number(value) })}
                      >
                        <SelectTrigger className="w-[60px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[6, 7, 8, 9, 10].map((year) => (
                            <SelectItem key={year} value={year.toString()}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {data.yearsToSpread} year{data.yearsToSpread > 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Results Section */}
            {isLoading ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Tax Calculation Results
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center py-12 text-muted-foreground">
                    <div className="text-center space-y-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p>Loading tax rates...</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
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

                  <TabsContent value="comparison" className="space-y-6 mt-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 rounded-lg border bg-card">
                        <p className="text-sm text-muted-foreground">Single Year CGT</p>
                        <p className="text-2xl font-bold text-destructive">
                          £{singleYearCalc.capitalGainsTax.toLocaleString()}
                        </p>
                      </div>
                      <div className="text-center p-4 rounded-lg border bg-card">
                        <p className="text-sm text-muted-foreground">{data.yearsToSpread}-Year CGT</p>
                        <p className="text-2xl font-bold text-emerald-600">
                          £{multiYearCalc.capitalGainsTax.toLocaleString()}
                        </p>
                      </div>
                      <div className="text-center p-4 rounded-lg border-2 border-primary bg-primary/5">
                        <p className="text-sm text-muted-foreground">Potential Savings</p>
                        <p className="text-2xl font-bold text-primary">
                          £{savings.toLocaleString()}
                        </p>
                        {savings > 0 && (
                          <Badge variant="secondary" className="mt-1">
                            {((savings / singleYearCalc.capitalGainsTax) * 100).toFixed(1)}% reduction
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Net Amount Comparison */}
                    <div className="space-y-3">
                      <h4 className="font-semibold">Net Amount After Tax</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-lg border bg-destructive/5">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-muted-foreground">Single Year:</span>
                          </div>
                          <div className="text-xl font-bold">£{singleYearCalc.netAmount.toLocaleString()}</div>
                        </div>
                        <div className="p-4 rounded-lg border bg-emerald-600/5">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-muted-foreground">{data.yearsToSpread} Years:</span>
                          </div>
                          <div className="text-xl font-bold text-emerald-600">
                            £{((data.currentIncome || 0) * data.yearsToSpread + (data.capitalGains || 0) - multiYearCalc.totalTax).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="single" className="space-y-4 mt-6">
                    <div className="space-y-4">
                      <h4 className="font-semibold">Single Year Withdrawal</h4>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total Withdrawal:</span>
                          <span className="font-medium">£{singleYearCalc.totalWithdrawal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Income Tax:</span>
                          <span>£{singleYearCalc.incomeTax.toLocaleString()}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Capital Gain:</span>
                          <span>£{data.capitalGains?.toLocaleString() || 0}</span>
                        </div>
                        {singleyearcapitalGainsBreakdown}
                        <div className="flex justify-between font-medium">
                          <span>Capital Gains Tax:</span>
                          <span className="text-destructive">£{singleYearCalc.capitalGainsTax.toLocaleString()}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-semibold">
                          <span>Total Tax:</span>
                          <span className="text-destructive">£{singleYearCalc.totalTax.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between font-semibold text-lg">
                          <span>Net Amount:</span>
                          <span className="text-emerald-600">£{singleYearCalc.netAmount.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="multi" className="space-y-4 mt-6">
                    <div className="space-y-4">
                      <h4 className="font-semibold flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {data.yearsToSpread}-Year Strategy
                      </h4>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total Over {data.yearsToSpread} Years:</span>
                          <span className="font-medium">
                            £{(((data.currentIncome || 0) * data.yearsToSpread) + (data.capitalGains || 0)).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Annual Capital Gains:</span>
                          <span>£{((data.capitalGains || 0) / data.yearsToSpread).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                        </div>
                        {multicapitalGainsBreakdown}
                        <Separator />
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total CGT:</span>
                          <span>£{multiYearCalc.capitalGainsTax.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total Income Tax:</span>
                          <span>£{multiYearCalc.incomeTax.toLocaleString()}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-semibold">
                          <span>Total Tax:</span>
                          <span className="text-destructive">£{multiYearCalc.totalTax.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between font-semibold text-lg">
                          <span>Net Amount:</span>
                          <span className="text-emerald-600">
                            £{(((data.currentIncome || 0) * data.yearsToSpread) + (data.capitalGains || 0) - multiYearCalc.totalTax).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
            )}
          </div>

          {/* Tax Information */}
          {TAX_RATES && !('error' in TAX_RATES) && TAX_RATES.taxYear && TAX_RATES.personalAllowance && TAX_RATES.bands && TAX_RATES.capitalGainsTax && (
            <Card>
              <CardHeader>
                <CardTitle>UK Tax Information ({TAX_RATES.taxYear.taxYear})</CardTitle>
                <CardDescription>Current tax rates and allowances used in calculations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="font-semibold mb-3">Income Tax</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Personal Allowance:</span>
                        <span>£{TAX_RATES.personalAllowance.amount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Basic Rate ({TAX_RATES.bands[0].taxRatePercent}%):</span>
                        <span>£{TAX_RATES.bands[0].bandStartAmount.toLocaleString()} - £{TAX_RATES.bands[0].bandEndAmount?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Higher Rate ({TAX_RATES.bands[1].taxRatePercent}%):</span>
                        <span>£{TAX_RATES.bands[1].bandStartAmount.toLocaleString()} - £{TAX_RATES.bands[1].bandEndAmount?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Additional Rate ({TAX_RATES.bands[2].taxRatePercent}%):</span>
                        <span>Over £{TAX_RATES.bands[2].bandStartAmount.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-3">Capital Gains Tax</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Annual Exempt Amount:</span>
                        <span>£{TAX_RATES.capitalGainsTax.annualExemptAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Basic Rate:</span>
                        <span>{TAX_RATES.capitalGainsTax.basicRatePercent}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Higher Rate:</span>
                        <span>{TAX_RATES.capitalGainsTax.higherRatePercent}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
