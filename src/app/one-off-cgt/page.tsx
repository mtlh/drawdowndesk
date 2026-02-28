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
import { TrendingUp, Info, AlertCircle } from "lucide-react"
import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"

import {
  calculateIncomeTax,
  calculateNationalInsurance,
  calculateCapitalGainsTax,
  type TaxRates,
} from "@/lib/taxCalculations"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { type TaxInfo } from "@/lib/createTakeHome"

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
  nationalInsurance: number
  capitalGainsTax: number
  totalTax: number
  netAmount: number
}

// Convert Convex TaxInfo to TaxRates for the calculation functions
function toTaxRates(taxInfo: TaxInfo): TaxRates | null {
  if (!taxInfo || 'error' in taxInfo || !taxInfo.bands || !taxInfo.personalAllowance) {
    return null;
  }

  // Find CGT from the taxInfo - it's an array
  const cgt = taxInfo.capitalGainsTax?.[0];

  return {
    personalAllowance: {
      amount: taxInfo.personalAllowance.amount,
      taperThreshold: taxInfo.personalAllowance.taperThreshold,
      taperRatePercent: taxInfo.personalAllowance.taperRatePercent,
    },
    bands: taxInfo.bands.map(band => ({
      bandName: band.bandName,
      bandStartAmount: band.bandStartAmount,
      bandEndAmount: band.bandEndAmount,
      taxRatePercent: band.taxRatePercent,
    })),
    capitalGainsTax: cgt ? {
      annualExemptAmount: cgt.annualExemptAmount,
      basicRatePercent: cgt.basicRatePercent,
      higherRatePercent: cgt.higherRatePercent,
    } : {
      annualExemptAmount: 12300, // Default for 2024/25
      basicRatePercent: 10,
      higherRatePercent: 20,
    },
  };
}


export default function OneOffCashflow() {
  // Get user for custom tax overrides
  const user = useQuery(api.currentUser.getCurrentUser.getCurrentUser)

  // Get user settings (to check if retired)
  const userSettings = useQuery(
    api.tax.userSettings.getUserSettings,
    user ? { userId: user._id as Id<"users"> } : "skip"
  )

  // Determine income type based on retirement status
  const isRetired = userSettings?.isRetired ?? false;
  const incomeType = isRetired ? "Pension" : "Employment";

  // Get current tax data - passes userId for custom overrides
  const TAX_RATES = useQuery(api.tax.runTaxQuery.getTaxInfoForIncome, {
    taxYear: 2025,
    userId: user?._id as Id<"users"> | undefined,
    incomeType: incomeType,
  }) as TaxInfo | undefined;

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
    nationalInsurance: 0,
    capitalGainsTax: 0,
    totalTax: 0,
    netAmount: 0,
  })

  const [multiYearCalc, setMultiYearCalc] = useState<TaxCalculation>({
    totalWithdrawal: 0,
    taxableAmount: 0,
    incomeTax: 0,
    nationalInsurance: 0,
    capitalGainsTax: 0,
    totalTax: 0,
    netAmount: 0,
  })


  useEffect(() => {
    // Convert to TaxRates inside effect to use stable TAX_RATES reference
    const rates = TAX_RATES && !('error' in TAX_RATES) ? toTaxRates(TAX_RATES) : null;

    const calculateTax = (years: number): TaxCalculation => {

      if (!rates) {
        return {
          totalWithdrawal: 0,
          taxableAmount: 0,
          incomeTax: 0,
          nationalInsurance: 0,
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

      const pensionPerYear = (pension ?? 0) / years;
      const capitalGainsPerYear = (capitalGains ?? 0) / years;

      const pensionTaxable = pensionPerYear * 0.75;

      const totalIncomePerYear = (currentIncome ?? 0) + pensionTaxable;

      const incomeTaxPerYear = calculateIncomeTax(totalIncomePerYear, rates);

      // NI only applies to employment income, not pension
      const nationalInsurancePerYear = isRetired ? 0 : calculateNationalInsurance(currentIncome ?? 0);

      const capitalGainsTaxPerYear = calculateCapitalGainsTax(capitalGainsPerYear, totalIncomePerYear, rates);

      const totalIncomeTax = incomeTaxPerYear * years;
      const totalNationalInsurance = nationalInsurancePerYear * years;
      const totalCapitalGainsTax = capitalGainsTaxPerYear * years;
      const totalTax = totalIncomeTax + totalNationalInsurance + totalCapitalGainsTax;

      const totalWithdrawal = (pension ?? 0) + (capitalGains ?? 0) + (inheritance ?? 0) + (currentIncome ?? 0);

      const taxableAmount =
          pensionTaxable * years + Math.max(0, (capitalGains ?? 0) - (rates.capitalGainsTax?.annualExemptAmount ?? 0) * years);

      return {
              totalWithdrawal,
              taxableAmount,
              incomeTax: totalIncomeTax,
              nationalInsurance: totalNationalInsurance,
              capitalGainsTax: totalCapitalGainsTax,
              totalTax,
              netAmount: totalWithdrawal - totalTax,
          };
      };

    setSingleYearCalc(calculateTax(1))
    setMultiYearCalc(calculateTax(data.yearsToSpread))
  }, [data, TAX_RATES, isRetired])

  const savings = singleYearCalc.capitalGainsTax - multiYearCalc.capitalGainsTax

  let singleyearcapitalGainsBreakdown = null;

  // Full CGT workings for single year
  if ((data.capitalGains ?? 0) > 0 && TAX_RATES && !('error' in TAX_RATES)) {
    const cgt = TAX_RATES.capitalGainsTax?.[0];
    const annualExempt = cgt?.annualExemptAmount ?? 0;
    const basicRate = cgt?.basicRatePercent ?? 10;
    const higherRate = cgt?.higherRatePercent ?? 20;
    const gains = data.capitalGains ?? 0;
    const taxableGains = Math.max(0, gains - annualExempt);

    // Get remaining basic band from TOTAL income (employment + 75% pension)
    const totalIncome = (data.currentIncome ?? 0) + ((data.pension ?? 0) * 0.75);
    const basicBandEnd = TAX_RATES.bands?.[0]?.bandEndAmount ?? 37700;
    const remainingBasicBand = Math.max(0, basicBandEnd - totalIncome);

    const basicRateAmount = Math.min(taxableGains, remainingBasicBand);
    const higherRateAmount = Math.max(0, taxableGains - remainingBasicBand);

    const basicTax = basicRateAmount * (basicRate / 100);
    const higherTax = higherRateAmount * (higherRate / 100);

    singleyearcapitalGainsBreakdown = (
      <div className="space-y-1 text-xs text-muted-foreground">
        <div className="flex justify-between">
          <span>Capital Gains:</span>
          <span>£{gains.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span>Less Annual Exempt:</span>
          <span>-£{annualExempt.toLocaleString()}</span>
        </div>
        <div className="flex justify-between font-medium">
          <span>Taxable Gains:</span>
          <span>£{taxableGains.toLocaleString()}</span>
        </div>
        <Separator className="my-1" />
        {basicRateAmount > 0 && (
          <div className="flex justify-between">
            <span>Basic rate ({basicRate}%):</span>
            <span>£{basicRateAmount.toLocaleString()} = £{basicTax.toLocaleString()}</span>
          </div>
        )}
        {higherRateAmount > 0 && (
          <div className="flex justify-between">
            <span>Higher rate ({higherRate}%):</span>
            <span>£{higherRateAmount.toLocaleString()} = £{higherTax.toLocaleString()}</span>
          </div>
        )}
      </div>
    );
  }

  let multicapitalGainsBreakdown = null;

  // Full CGT workings for multi-year
  if ((data.capitalGains ?? 0) > 0 && TAX_RATES && !('error' in TAX_RATES)) {
    const cgt = TAX_RATES.capitalGainsTax?.[0];
    const annualExempt = cgt?.annualExemptAmount ?? 0;
    const basicRate = cgt?.basicRatePercent ?? 10;
    const higherRate = cgt?.higherRatePercent ?? 20;
    const years = data.yearsToSpread;
    const totalGains = data.capitalGains ?? 0;
    const annualGains = totalGains / years;
    const taxableGainsPerYear = Math.max(0, annualGains - annualExempt);

    // Get remaining basic band from income (per year)
    const totalIncome = (data.currentIncome ?? 0) + ((data.pension ?? 0) * 0.75);
    const basicBandEnd = TAX_RATES.bands?.[0]?.bandEndAmount ?? 37700;
    const remainingBasicBand = Math.max(0, basicBandEnd - totalIncome);

    const basicRateAmount = Math.min(taxableGainsPerYear, remainingBasicBand);
    const higherRateAmount = Math.max(0, taxableGainsPerYear - remainingBasicBand);

    const basicTaxPerYear = basicRateAmount * (basicRate / 100);
    const higherTaxPerYear = higherRateAmount * (higherRate / 100);
    const totalBasicTax = basicTaxPerYear * years;
    const totalHigherTax = higherTaxPerYear * years;

    multicapitalGainsBreakdown = (
      <div className="space-y-1 text-xs text-muted-foreground">
        <div className="flex justify-between">
          <span>Total Capital Gains:</span>
          <span>£{totalGains.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span>Per Year:</span>
          <span>£{annualGains.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span>Less Annual Exempt (per year):</span>
          <span>-£{annualExempt.toLocaleString()}</span>
        </div>
        <div className="flex justify-between font-medium">
          <span>Taxable Gains Per Year:</span>
          <span>£{taxableGainsPerYear.toLocaleString()}</span>
        </div>
        <Separator className="my-1" />
        {basicRateAmount > 0 && (
          <div className="flex justify-between">
            <span>Basic rate ({basicRate}%):</span>
            <span>£{basicRateAmount.toLocaleString()}/yr = £{basicTaxPerYear.toLocaleString()}/yr</span>
          </div>
        )}
        {higherRateAmount > 0 && (
          <div className="flex justify-between">
            <span>Higher rate ({higherRate}%):</span>
            <span>£{higherRateAmount.toLocaleString()}/yr = £{higherTaxPerYear.toLocaleString()}/yr</span>
          </div>
        )}
        <Separator className="my-1" />
        <div className="flex justify-between font-medium">
          <span>Total CGT:</span>
          <span>£{(totalBasicTax + totalHigherTax).toLocaleString()}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 space-y-8">
          {/* Header */}
          <div className="space-y-2"></div>

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
                    {TAX_RATES && !('error' in TAX_RATES) && TAX_RATES.capitalGainsTax && ((TAX_RATES.capitalGainsTax[0]?.annualExemptAmount ?? 0) > 0) &&
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Info className="h-3 w-3" />
                        £{(TAX_RATES.capitalGainsTax[0]?.annualExemptAmount ?? 0).toLocaleString()} allowance
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
                  <LoadingSpinner message="Loading tax rates..." />
                </CardContent>
              </Card>
            ) : TAX_RATES && 'error' in TAX_RATES && TAX_RATES.error ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-5 w-5" />
                    Error Loading Tax Data
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{TAX_RATES.error}</p>
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
                          £{(singleYearCalc?.capitalGainsTax ?? 0).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-center p-4 rounded-lg border bg-card">
                        <p className="text-sm text-muted-foreground">{data.yearsToSpread}-Year CGT</p>
                        <p className="text-2xl font-bold text-emerald-600">
                          £{(multiYearCalc?.capitalGainsTax ?? 0).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-center p-4 rounded-lg border-2 border-primary bg-primary/5">
                        <p className="text-sm text-muted-foreground">Potential Savings</p>
                        <p className="text-2xl font-bold text-primary">
                          £{(savings ?? 0).toLocaleString()}
                        </p>
                        {savings > 0 && singleYearCalc?.capitalGainsTax > 0 && (
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
                          <div className="text-xl font-bold">£{(singleYearCalc?.netAmount ?? 0).toLocaleString()}</div>
                        </div>
                        <div className="p-4 rounded-lg border bg-emerald-600/5">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-muted-foreground">{data.yearsToSpread} Years:</span>
                          </div>
                          <div className="text-xl font-bold text-emerald-600">
                            £{(((data.currentIncome || 0) * data.yearsToSpread + (data.capitalGains || 0) - (multiYearCalc?.totalTax ?? 0))).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="single" className="mt-6">
                    <div className="grid md:grid-cols-2 gap-8">
                      {/* Income Tax Breakdown */}
                      <div className="space-y-3">
                        <h4 className="font-semibold text-lg">Income Tax ({isRetired ? "Pension" : "Employment"} Rates)</h4>
                        <div className="space-y-2 text-sm border rounded-lg p-4">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Current Income:</span>
                            <span>£{(data.currentIncome ?? 0).toLocaleString()}</span>
                          </div>
                          {(data.pension ?? 0) > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Pension (75% taxable):</span>
                              <span>£{((data.pension ?? 0) * 0.75).toLocaleString()}</span>
                            </div>
                          )}
                          {TAX_RATES && !('error' in TAX_RATES) && (
                            <>
                              {((data.pension ?? 0) > 0 || (data.currentIncome ?? 0) > 0) && (
                                <>
                                  <div className="flex justify-between font-medium">
                                    <span>Total Taxable Income:</span>
                                    <span>£{((data.currentIncome ?? 0) + ((data.pension ?? 0) * 0.75)).toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Personal Allowance:</span>
                                    <span>-£{(TAX_RATES.personalAllowance?.amount ?? 0).toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between font-medium">
                                    <span>Tax After Allowance:</span>
                                    <span>£{Math.max(0, ((data.currentIncome ?? 0) + ((data.pension ?? 0) * 0.75)) - (TAX_RATES.personalAllowance?.amount ?? 0)).toLocaleString()}</span>
                                  </div>
                                </>
                              )}
                              {(() => {
                                const totalIncome = (data.currentIncome ?? 0) + ((data.pension ?? 0) * 0.75);
                                const personalAllowance = TAX_RATES.personalAllowance?.amount ?? 0;
                                const taxableIncome = Math.max(0, totalIncome - personalAllowance);

                                // UK tax bands start at £0 - calculate amount in each band sequentially
                                let previousBandEnd = 0;

                                return [...(TAX_RATES.bands || [])]
                                  .sort((a, b) => (a.bandStartAmount || 0) - (b.bandStartAmount || 0))
                                  .slice(0, 3)
                                  .map((band, idx) => {
                                  const bandEnd = band.bandEndAmount ?? Infinity;
                                  const rate = band.taxRatePercent;

                                  // Amount in this band is from where previous band ended to min(taxable, band end)
                                  const taxableInBand = Math.max(0, Math.min(taxableIncome, bandEnd) - previousBandEnd);
                                  previousBandEnd = bandEnd;

                                  if (taxableInBand <= 0) return null;

                                  const taxInBand = taxableInBand * (rate / 100);

                                  return (
                                    <div key={idx} className="flex justify-between">
                                      <span className="text-muted-foreground">
                                        {band.bandName} ({rate}%):
                                      </span>
                                      <span>£{taxableInBand.toLocaleString()} = £{taxInBand.toLocaleString()}</span>
                                    </div>
                                  );
                                });
                              })()}
                            </>
                          )}
                          <Separator />
                          <div className="flex justify-between font-semibold">
                            <span>Total Income Tax:</span>
                            <span className="text-destructive">£{(singleYearCalc?.incomeTax ?? 0).toLocaleString()}</span>
                          </div>
                          {!isRetired && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">National Insurance:</span>
                              <span className="text-destructive">£{(singleYearCalc?.nationalInsurance ?? 0).toLocaleString()}</span>
                            </div>
                          )}
                          {(() => {
                            const totalIncome = (data.currentIncome ?? 0) + ((data.pension ?? 0) * 0.75);
                            const totalTax = (singleYearCalc?.incomeTax ?? 0) + (singleYearCalc?.nationalInsurance ?? 0);
                            const taxRate = totalIncome > 0 ? (totalTax / totalIncome * 100) : 0;
                            return (
                              <div className="flex justify-between text-sm text-muted-foreground">
                                <span>Effective Tax Rate:</span>
                                <span>{taxRate.toFixed(1)}%</span>
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Capital Gains Tax Breakdown */}
                      <div className="space-y-3">
                        <h4 className="font-semibold text-lg">Capital Gains Tax</h4>
                        <div className="space-y-2 text-sm border rounded-lg p-4">
                          {singleyearcapitalGainsBreakdown}
                          <Separator />
                          <div className="flex justify-between font-semibold">
                            <span>Total CGT:</span>
                            <span className="text-destructive">£{(singleYearCalc?.capitalGainsTax ?? 0).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Summary */}
                    <div className="mt-8 border-t pt-6">
                      <div className="grid md:grid-cols-3 gap-6 text-lg">
                        <div className="flex justify-between md:block">
                          <span className="text-muted-foreground">Total Withdrawal:</span>
                          <span className="font-medium md:block">£{(singleYearCalc?.totalWithdrawal ?? 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between md:block">
                          <span className="text-muted-foreground">Total Tax:</span>
                          <span className="text-destructive font-semibold md:block">£{(singleYearCalc?.totalTax ?? 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between md:block">
                          <span className="text-muted-foreground">Net Amount:</span>
                          <span className="text-emerald-600 font-bold md:block">£{(singleYearCalc?.netAmount ?? 0).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="multi" className="mt-6">
                    <div className="grid md:grid-cols-2 gap-8">
                      {/* Income Tax Breakdown */}
                      <div className="space-y-3">
                        <h4 className="font-semibold text-lg">Income Tax ({isRetired ? "Pension" : "Employment"} Rates) - {data.yearsToSpread} years</h4>
                        <div className="space-y-2 text-sm border rounded-lg p-4">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Annual Income:</span>
                            <span>£{(data.currentIncome ?? 0).toLocaleString()}</span>
                          </div>
                          {(data.pension ?? 0) > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Pension (75% taxable):</span>
                              <span>£{(((data.pension ?? 0) * 0.75) / data.yearsToSpread).toLocaleString()}/yr</span>
                            </div>
                          )}
                          <div className="flex justify-between font-medium">
                            <span>Total Income/yr (before allowance):</span>
                            <span>£{((data.currentIncome ?? 0) + ((data.pension ?? 0) * 0.75)).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between font-medium">
                            <span>Total Over {data.yearsToSpread} Years:</span>
                            <span>£{(((data.currentIncome ?? 0) + ((data.pension ?? 0) * 0.75)) * data.yearsToSpread).toLocaleString()}</span>
                          </div>
                          {TAX_RATES && !('error' in TAX_RATES) && (
                            <>
                              <Separator />
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Personal Allowance (yr):</span>
                                <span>-£{(TAX_RATES.personalAllowance?.amount ?? 0).toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between font-medium">
                                <span>Tax After Allowance (yr):</span>
                                <span>£{Math.max(0, (((data.currentIncome ?? 0) + ((data.pension ?? 0) * 0.75)) / data.yearsToSpread) - (TAX_RATES.personalAllowance?.amount ?? 0)).toLocaleString()}</span>
                              </div>
                              {(() => {
                                const years = data.yearsToSpread;
                                const totalAnnualIncome = ((data.currentIncome ?? 0) + ((data.pension ?? 0) * 0.75)) / years;
                                const personalAllowance = TAX_RATES.personalAllowance?.amount ?? 0;
                                const taxableIncomePerYear = Math.max(0, totalAnnualIncome - personalAllowance);

                                // UK tax bands start at £0 - calculate amount in each band sequentially
                                let previousBandEnd = 0;

                                return [...(TAX_RATES.bands || [])]
                                  .sort((a, b) => (a.bandStartAmount || 0) - (b.bandStartAmount || 0))
                                  .slice(0, 3)
                                  .map((band, idx) => {
                                  const bandEnd = band.bandEndAmount ?? Infinity;
                                  const rate = band.taxRatePercent;

                                  // Amount in this band is from where previous band ended to min(taxable, band end)
                                  const taxableInBand = Math.max(0, Math.min(taxableIncomePerYear, bandEnd) - previousBandEnd);
                                  previousBandEnd = bandEnd;

                                  if (taxableInBand <= 0) return null;

                                  const taxInBandPerYear = taxableInBand * (rate / 100);

                                  return (
                                    <div key={idx} className="flex justify-between">
                                      <span className="text-muted-foreground">
                                        {band.bandName} ({rate}%):
                                      </span>
                                      <span>£{taxableInBand.toLocaleString()}/yr = £{taxInBandPerYear.toLocaleString()}/yr</span>
                                    </div>
                                  );
                                });
                              })()}
                            </>
                          )}
                          <Separator />
                          <div className="flex justify-between font-semibold">
                            <span>Total Income Tax:</span>
                            <span className="text-destructive">£{(multiYearCalc?.incomeTax ?? 0).toLocaleString()}</span>
                          </div>
                          {!isRetired && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">National Insurance:</span>
                              <span className="text-destructive">£{(multiYearCalc?.nationalInsurance ?? 0).toLocaleString()}</span>
                            </div>
                          )}
                          {(() => {
                            const totalIncome = ((data.currentIncome ?? 0) + ((data.pension ?? 0) * 0.75)) * data.yearsToSpread;
                            const totalTax = (multiYearCalc?.incomeTax ?? 0) + (multiYearCalc?.nationalInsurance ?? 0);
                            const taxRate = totalIncome > 0 ? (totalTax / totalIncome * 100) : 0;
                            return (
                              <div className="flex justify-between text-sm text-muted-foreground">
                                <span>Effective Tax Rate:</span>
                                <span>{taxRate.toFixed(1)}%</span>
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Capital Gains Tax Breakdown */}
                      <div className="space-y-3">
                        <h4 className="font-semibold text-lg">Capital Gains Tax</h4>
                        <div className="space-y-2 text-sm border rounded-lg p-4">
                          {multicapitalGainsBreakdown}
                          <Separator />
                          <div className="flex justify-between font-semibold">
                            <span>Total CGT:</span>
                            <span className="text-destructive">£{(multiYearCalc?.capitalGainsTax ?? 0).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Summary */}
                    <div className="mt-8 border-t pt-6">
                      <div className="grid md:grid-cols-3 gap-6 text-lg">
                        <div className="flex justify-between md:block">
                          <span className="text-muted-foreground">Total Withdrawal:</span>
                          <span className="font-medium md:block">£{(((data.currentIncome ?? 0) * data.yearsToSpread) + (data.capitalGains ?? 0)).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between md:block">
                          <span className="text-muted-foreground">Total Tax:</span>
                          <span className="text-destructive font-semibold md:block">£{(multiYearCalc?.totalTax ?? 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between md:block">
                          <span className="text-muted-foreground">Net Amount:</span>
                          <span className="text-emerald-600 font-bold md:block">£{(((data.currentIncome ?? 0) * data.yearsToSpread) + (data.capitalGains ?? 0) - (multiYearCalc?.totalTax ?? 0)).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
