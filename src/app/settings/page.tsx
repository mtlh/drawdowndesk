"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Settings as SettingsIcon, RotateCcw, Pencil, Check, X } from "lucide-react"
import { useQuery, useMutation, Authenticated } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { LoadingSpinner } from "@/components/ui/loading-spinner"

const CURRENT_TAX_YEAR = 2025

// Default UK values for 2025/26
const DEFAULT_ALLOWANCE = {
  amount: 12570,
  taperThreshold: 100000,
  taperRatePercent: 50,
}

const DEFAULT_BANDS = [
  { incomeType: "Employment", bandName: "Basic Rate", bandStartAmount: 12571, bandEndAmount: 50270, taxRatePercent: 20, nationalInsuranceRate: 8 },
  { incomeType: "Employment", bandName: "Higher Rate", bandStartAmount: 50271, bandEndAmount: 125140, taxRatePercent: 40, nationalInsuranceRate: 2 },
  { incomeType: "Employment", bandName: "Additional Rate", bandStartAmount: 125141, bandEndAmount: null, taxRatePercent: 45, nationalInsuranceRate: 2 },
]

const DEFAULT_CGT = [
  { assetType: "Shares", annualExemptAmount: 3000, basicRatePercent: 10, higherRatePercent: 20 },
  { assetType: "Residential Property", annualExemptAmount: 3000, basicRatePercent: 18, higherRatePercent: 28 },
]

interface TaxBand {
  incomeType: string
  bandName: string
  bandStartAmount: number
  bandEndAmount: number | null
  taxRatePercent: number
  nationalInsuranceRate: number
}

interface CgtRate {
  assetType: string
  annualExemptAmount: number
  basicRatePercent: number
  higherRatePercent: number
}

function SettingsContent() {
  const user = useQuery(api.currentUser.getCurrentUser.getCurrentUser)
  const userOverrides = useQuery(
    api.tax.userTaxOverrides.getUserTaxOverrides,
    user ? { userId: user._id as Id<"users">, taxYear: CURRENT_TAX_YEAR } : "skip"
  )

  const setAllowance = useMutation(api.tax.userTaxOverrides.setUserTaxAllowance)
  const deleteAllowance = useMutation(api.tax.userTaxOverrides.deleteUserTaxAllowance)
  const setTaxBand = useMutation(api.tax.userTaxOverrides.setUserTaxBand)
  const deleteTaxBand = useMutation(api.tax.userTaxOverrides.deleteUserTaxBand)
  const setCgt = useMutation(api.tax.userTaxOverrides.setUserCapitalGainsTax)
  const deleteCgt = useMutation(api.tax.userTaxOverrides.deleteUserCapitalGainsTax)

  const [allowance, setAllowanceState] = useState(DEFAULT_ALLOWANCE)
  const [bands, setBands] = useState<TaxBand[]>(DEFAULT_BANDS)
  const [cgt, setCgtState] = useState<CgtRate[]>(DEFAULT_CGT)
  const [editingAllowance, setEditingAllowance] = useState(false)
  const [editingBandIndex, setEditingBandIndex] = useState<number | null>(null)
  const [editingCgtIndex, setEditingCgtIndex] = useState<number | null>(null)
  const [savedMessage, setSavedMessage] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  // Load user overrides when they load
  useEffect(() => {
    if (userOverrides) {
      if (userOverrides.allowance) {
        setAllowanceState({
          amount: userOverrides.allowance.amount,
          taperThreshold: userOverrides.allowance.taperThreshold,
          taperRatePercent: userOverrides.allowance.taperRatePercent,
        })
      }
      if (userOverrides.bands && userOverrides.bands.length > 0) {
        setBands(userOverrides.bands.map(b => ({
          incomeType: b.incomeType,
          bandName: b.bandName,
          bandStartAmount: b.bandStartAmount,
          bandEndAmount: b.bandEndAmount ?? null,
          taxRatePercent: b.taxRatePercent,
          nationalInsuranceRate: b.nationalInsuranceRate ?? 0,
        })))
      }
      if (userOverrides.cgt && userOverrides.cgt.length > 0) {
        setCgtState(userOverrides.cgt.map(c => ({
          assetType: c.assetType,
          annualExemptAmount: c.annualExemptAmount,
          basicRatePercent: c.basicRatePercent,
          higherRatePercent: c.higherRatePercent,
        })))
      }
    }
  }, [userOverrides])

  const hasAllowanceOverride = userOverrides?.hasAllowanceOverride
  const hasBandOverrides = userOverrides?.hasBandOverrides
  const hasCgtOverrides = userOverrides?.hasCgtOverrides

  const handleSaveAllowance = async () => {
    if (!user) return
    setIsSaving(true)
    try {
      await setAllowance({
        userId: user._id as Id<"users">,
        taxYear: CURRENT_TAX_YEAR,
        amount: allowance.amount,
        taperThreshold: allowance.taperThreshold,
        taperRatePercent: allowance.taperRatePercent,
      })
      setSavedMessage("Personal allowance saved!")
      setEditingAllowance(false)
    } catch {
      setSavedMessage("Error saving allowance")
    }
    setIsSaving(false)
    setTimeout(() => setSavedMessage(""), 3000)
  }

  const handleResetAllowance = async () => {
    if (!user) return
    setIsSaving(true)
    try {
      await deleteAllowance({ userId: user._id as Id<"users">, taxYear: CURRENT_TAX_YEAR })
      setAllowanceState(DEFAULT_ALLOWANCE)
      setSavedMessage("Reset to default allowance")
    } catch {
      setSavedMessage("Error resetting allowance")
    }
    setIsSaving(false)
    setTimeout(() => setSavedMessage(""), 3000)
  }

  const handleSaveBand = async (index: number) => {
    if (!user) return
    const band = bands[index]
    setIsSaving(true)
    try {
      await setTaxBand({
        userId: user._id as Id<"users">,
        taxYear: CURRENT_TAX_YEAR,
        incomeType: band.incomeType,
        bandName: band.bandName,
        bandStartAmount: band.bandStartAmount,
        bandEndAmount: band.bandEndAmount ?? undefined,
        taxRatePercent: band.taxRatePercent,
        nationalInsuranceRate: band.nationalInsuranceRate,
      })
      setSavedMessage(`Tax band "${band.bandName}" saved!`)
      setEditingBandIndex(null)
    } catch {
      setSavedMessage("Error saving tax band")
    }
    setIsSaving(false)
    setTimeout(() => setSavedMessage(""), 3000)
  }

  const handleResetBand = async (index: number) => {
    if (!user) return
    const band = DEFAULT_BANDS[index]
    setBands(prev => prev.map((b, i) => i === index ? {
      ...b,
      bandStartAmount: band.bandStartAmount,
      bandEndAmount: band.bandEndAmount,
      taxRatePercent: band.taxRatePercent,
      nationalInsuranceRate: band.nationalInsuranceRate,
    } : b))

    setIsSaving(true)
    try {
      await deleteTaxBand({
        userId: user._id as Id<"users">,
        taxYear: CURRENT_TAX_YEAR,
        incomeType: band.incomeType,
        bandName: band.bandName,
      })
      setSavedMessage(`Reset "${band.bandName}" to default`)
    } catch {
      setSavedMessage("Error resetting tax band")
    }
    setIsSaving(false)
    setEditingBandIndex(null)
    setTimeout(() => setSavedMessage(""), 3000)
  }

  const handleSaveCgt = async (index: number) => {
    if (!user) return
    const c = cgt[index]
    setIsSaving(true)
    try {
      await setCgt({
        userId: user._id as Id<"users">,
        taxYear: CURRENT_TAX_YEAR,
        assetType: c.assetType,
        annualExemptAmount: c.annualExemptAmount,
        basicRatePercent: c.basicRatePercent,
        higherRatePercent: c.higherRatePercent,
      })
      setSavedMessage(`CGT for "${c.assetType}" saved!`)
      setEditingCgtIndex(null)
    } catch {
      setSavedMessage("Error saving CGT")
    }
    setIsSaving(false)
    setTimeout(() => setSavedMessage(""), 3000)
  }

  const handleResetCgt = async (index: number) => {
    if (!user) return
    const c = DEFAULT_CGT[index]
    setCgtState(prev => prev.map((cg, i) => i === index ? {
      assetType: c.assetType,
      annualExemptAmount: c.annualExemptAmount,
      basicRatePercent: c.basicRatePercent,
      higherRatePercent: c.higherRatePercent,
    } : cg))

    setIsSaving(true)
    try {
      await deleteCgt({
        userId: user._id as Id<"users">,
        taxYear: CURRENT_TAX_YEAR,
        assetType: c.assetType,
      })
      setSavedMessage(`Reset CGT for "${c.assetType}" to default`)
    } catch {
      setSavedMessage("Error resetting CGT")
    }
    setIsSaving(false)
    setEditingCgtIndex(null)
    setTimeout(() => setSavedMessage(""), 3000)
  }

  if (!user) {
    return <LoadingSpinner fullScreen message="Loading..." />
  }

  return (
    <div className="flex h-screen bg-background">
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <SettingsIcon className="h-8 w-8" />
              Settings
            </h1>
            <p className="text-muted-foreground">
              Configure your application preferences and customise tax rules.
            </p>
          </div>

          {savedMessage && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-md">
              {savedMessage}
            </div>
          )}

          <Tabs defaultValue="allowance" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="allowance">Personal Allowance</TabsTrigger>
              <TabsTrigger value="bands">Tax Bands</TabsTrigger>
              <TabsTrigger value="cgt">Capital Gains Tax</TabsTrigger>
            </TabsList>

            {/* Personal Allowance Tab */}
            <TabsContent value="allowance">
              <Card>
                <CardHeader>
                  <CardTitle>Personal Allowance {hasAllowanceOverride && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded ml-2">Custom</span>}</CardTitle>
                  <CardDescription>
                    The amount of income you can receive without paying income tax. UK default: £12,570 for 2025/26.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {editingAllowance ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Personal Allowance (£)</Label>
                          <Input
                            type="number"
                            value={allowance.amount}
                            onChange={(e) => setAllowanceState({ ...allowance, amount: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Taper Threshold (£)</Label>
                          <Input
                            type="number"
                            value={allowance.taperThreshold}
                            onChange={(e) => setAllowanceState({ ...allowance, taperThreshold: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Taper Rate (%)</Label>
                        <Input
                          type="number"
                          value={allowance.taperRatePercent}
                          onChange={(e) => setAllowanceState({ ...allowance, taperRatePercent: parseFloat(e.target.value) || 0 })}
                        />
                        <p className="text-sm text-muted-foreground">
                          Percentage of allowance lost for each £2 over threshold (50% = lose £1 per £2)
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleSaveAllowance} disabled={isSaving} className="gap-2">
                          <Check className="h-4 w-4" /> Save
                        </Button>
                        <Button variant="outline" onClick={() => setEditingAllowance(false)} className="gap-2">
                          <X className="h-4 w-4" /> Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Allowance:</span>
                          <p className="font-medium">£{allowance.amount.toLocaleString()}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Taper Threshold:</span>
                          <p className="font-medium">£{allowance.taperThreshold.toLocaleString()}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Taper Rate:</span>
                          <p className="font-medium">{allowance.taperRatePercent}%</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setEditingAllowance(true)} className="gap-2">
                          <Pencil className="h-4 w-4" /> Edit
                        </Button>
                        {hasAllowanceOverride && (
                          <Button variant="outline" onClick={handleResetAllowance} className="gap-2">
                            <RotateCcw className="h-4 w-4" /> Reset to Default
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tax Bands Tab */}
            <TabsContent value="bands">
              <Card>
                <CardHeader>
                  <CardTitle>Income Tax Bands {hasBandOverrides && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded ml-2">Custom</span>}</CardTitle>
                  <CardDescription>
                    Tax rates applied to different income brackets. UK defaults for 2025/26.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {bands.map((band, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      {editingBandIndex === index ? (
                        <div className="space-y-4">
                          <h4 className="font-medium">{band.bandName}</h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Band Start (£)</Label>
                              <Input
                                type="number"
                                value={band.bandStartAmount}
                                onChange={(e) => {
                                  const newBands = [...bands]
                                  newBands[index].bandStartAmount = parseFloat(e.target.value) || 0
                                  setBands(newBands)
                                }}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Band End (£, leave empty for unlimited)</Label>
                              <Input
                                type="number"
                                value={band.bandEndAmount || ""}
                                onChange={(e) => {
                                  const newBands = [...bands]
                                  newBands[index].bandEndAmount = e.target.value ? parseFloat(e.target.value) : null
                                  setBands(newBands)
                                }}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Tax Rate (%)</Label>
                              <Input
                                type="number"
                                value={band.taxRatePercent}
                                onChange={(e) => {
                                  const newBands = [...bands]
                                  newBands[index].taxRatePercent = parseFloat(e.target.value) || 0
                                  setBands(newBands)
                                }}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>National Insurance (%)</Label>
                              <Input
                                type="number"
                                value={band.nationalInsuranceRate}
                                onChange={(e) => {
                                  const newBands = [...bands]
                                  newBands[index].nationalInsuranceRate = parseFloat(e.target.value) || 0
                                  setBands(newBands)
                                }}
                              />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={() => handleSaveBand(index)} disabled={isSaving} size="sm" className="gap-2">
                              <Check className="h-4 w-4" /> Save
                            </Button>
                            <Button variant="outline" onClick={() => setEditingBandIndex(null)} size="sm" className="gap-2">
                              <X className="h-4 w-4" /> Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium">{band.bandName}</h4>
                              <p className="text-sm text-muted-foreground">
                                £{band.bandStartAmount.toLocaleString()} - {band.bandEndAmount ? `£${band.bandEndAmount.toLocaleString()}` : "unlimited"}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">{band.taxRatePercent}% tax</p>
                              <p className="text-sm text-muted-foreground">{band.nationalInsuranceRate}% NI</p>
                            </div>
                          </div>
                          <div className="flex gap-2 mt-2">
                            <Button variant="outline" size="sm" onClick={() => setEditingBandIndex(index)} className="gap-2">
                              <Pencil className="h-3 w-3" /> Edit
                            </Button>
                            {hasBandOverrides && (
                              <Button variant="outline" size="sm" onClick={() => handleResetBand(index)} className="gap-2">
                                <RotateCcw className="h-3 w-3" /> Reset
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* CGT Tab */}
            <TabsContent value="cgt">
              <Card>
                <CardHeader>
                  <CardTitle>Capital Gains Tax {hasCgtOverrides && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded ml-2">Custom</span>}</CardTitle>
                  <CardDescription>
                    Tax rates on gains from selling assets. UK defaults for 2025/26.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {cgt.map((c, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      {editingCgtIndex === index ? (
                        <div className="space-y-4">
                          <h4 className="font-medium">{c.assetType}</h4>
                          <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label>Annual Exempt Amount (£)</Label>
                              <Input
                                type="number"
                                value={c.annualExemptAmount}
                                onChange={(e) => {
                                  const newCgt = [...cgt]
                                  newCgt[index].annualExemptAmount = parseFloat(e.target.value) || 0
                                  setCgtState(newCgt)
                                }}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Basic Rate (%)</Label>
                              <Input
                                type="number"
                                value={c.basicRatePercent}
                                onChange={(e) => {
                                  const newCgt = [...cgt]
                                  newCgt[index].basicRatePercent = parseFloat(e.target.value) || 0
                                  setCgtState(newCgt)
                                }}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Higher Rate (%)</Label>
                              <Input
                                type="number"
                                value={c.higherRatePercent}
                                onChange={(e) => {
                                  const newCgt = [...cgt]
                                  newCgt[index].higherRatePercent = parseFloat(e.target.value) || 0
                                  setCgtState(newCgt)
                                }}
                              />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={() => handleSaveCgt(index)} disabled={isSaving} size="sm" className="gap-2">
                              <Check className="h-4 w-4" /> Save
                            </Button>
                            <Button variant="outline" onClick={() => setEditingCgtIndex(null)} size="sm" className="gap-2">
                              <X className="h-4 w-4" /> Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium">{c.assetType}</h4>
                              <p className="text-sm text-muted-foreground">
                                Annual exempt: £{c.annualExemptAmount.toLocaleString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">Basic: {c.basicRatePercent}% | Higher: {c.higherRatePercent}%</p>
                            </div>
                          </div>
                          <div className="flex gap-2 mt-2">
                            <Button variant="outline" size="sm" onClick={() => setEditingCgtIndex(index)} className="gap-2">
                              <Pencil className="h-3 w-3" /> Edit
                            </Button>
                            {hasCgtOverrides && (
                              <Button variant="outline" size="sm" onClick={() => handleResetCgt(index)} className="gap-2">
                                <RotateCcw className="h-3 w-3" /> Reset
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* About Section */}
          <Card>
            <CardHeader>
              <CardTitle>About</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm">
                <strong>DrawdownDesk</strong> - Personal finance and investment portfolio management.
              </p>
              <p className="text-sm text-muted-foreground">
                Current tax year: {CURRENT_TAX_YEAR}/{CURRENT_TAX_YEAR + 1}
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Authenticated>
      <SettingsContent />
    </Authenticated>
  )
}
