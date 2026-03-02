"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Settings as SettingsIcon, RotateCcw, Pencil, Check, X, Moon, Sun } from "lucide-react"
import { useQuery, useMutation, Authenticated } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useCurrentUser } from "@/hooks/useCurrentUser"
import { useUserTheme } from "@/hooks/useUserTheme"
import { useIsElectron } from "@/hooks/useIsElectron"
import { DOWNLOAD_URL } from "@/lib/app-config"

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
  const user = useCurrentUser()
  const { theme, setTheme } = useUserTheme()
  const isElectron = useIsElectron()
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

  // State pension settings
  const userSettings = useQuery(
    api.tax.userSettings.getUserSettings,
    user ? { userId: user._id as Id<"users"> } : "skip"
  )
  const saveUserSettings = useMutation(api.tax.userSettings.saveUserSettings)

  const [allowance, setAllowanceState] = useState(DEFAULT_ALLOWANCE)
  const [bands, setBands] = useState<TaxBand[]>(DEFAULT_BANDS)
  const [cgt, setCgtState] = useState<CgtRate[]>(DEFAULT_CGT)
  const [editingAllowance, setEditingAllowance] = useState(false)
  const [editingBandIndex, setEditingBandIndex] = useState<number | null>(null)
  const [editingCgtIndex, setEditingCgtIndex] = useState<number | null>(null)
  const [editingStatePension, setEditingStatePension] = useState(false)
  const [savedMessage, setSavedMessage] = useState("")

  // State pension settings
  const [statePension, setStatePension] = useState({ amount: 11000, age: 67 })
  const [isRetired, setIsRetired] = useState(false)
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

  // Load user state pension settings
  useEffect(() => {
    if (userSettings) {
      setStatePension({
        amount: userSettings.statePensionAmount,
        age: userSettings.statePensionAge,
      })
      setIsRetired(userSettings.isRetired ?? false)
    }
  }, [userSettings])

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

  const handleSaveStatePension = async () => {
    if (!user) return
    setIsSaving(true)
    try {
      await saveUserSettings({
        userId: user._id as Id<"users">,
        statePensionAmount: statePension.amount,
        statePensionAge: statePension.age,
        isRetired: isRetired,
      })
      setSavedMessage("State pension settings saved!")
      setEditingStatePension(false)
    } catch {
      setSavedMessage("Error saving state pension settings")
    }
    setIsSaving(false)
    setTimeout(() => setSavedMessage(""), 3000)
  }

  if (!user) {
    return <LoadingSpinner fullScreen message="Loading..." />
  }

  return (
    <div className="flex h-screen bg-background">
      <main className="flex-1 overflow-y-auto bg-background">
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
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="appearance">Appearance</TabsTrigger>
              <TabsTrigger value="allowance">Personal Allowance</TabsTrigger>
              <TabsTrigger value="bands">Tax Bands</TabsTrigger>
              <TabsTrigger value="cgt">Capital Gains Tax</TabsTrigger>
              <TabsTrigger value="statePension">State Pension</TabsTrigger>
            </TabsList>

            {/* Appearance Tab */}
            <TabsContent value="appearance">
              <Card>
                <CardHeader>
                  <CardTitle>Appearance</CardTitle>
                  <CardDescription>
                    Customize how DrawdownDesk looks. Choose your preferred color theme.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4">
                    <button
                      onClick={() => {
                        setTheme("dark")
                        document.documentElement.classList.add("dark")
                      }}
                      className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                        theme === "dark"
                          ? "border-primary bg-accent"
                          : "border-border hover:border-muted-foreground"
                      }`}
                    >
                      <div className="w-20 h-14 rounded bg-slate-900 flex items-center justify-center">
                        <Moon className="w-6 h-6 text-white" />
                      </div>
                      <span className="text-sm font-medium">Dark</span>
                    </button>
                    <button
                      onClick={() => {
                        setTheme("light")
                        document.documentElement.classList.remove("dark")
                      }}
                      className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                        theme === "light"
                          ? "border-primary bg-accent"
                          : "border-border hover:border-muted-foreground"
                      }`}
                    >
                      <div className="w-20 h-14 rounded bg-white border flex items-center justify-center">
                        <Sun className="w-6 h-6 text-slate-900" />
                      </div>
                      <span className="text-sm font-medium">Light</span>
                    </button>
                  </div>
                  <p className="text-sm text-muted-foreground mt-4">
                    Your preference is saved automatically and synced across your devices.
                  </p>
                </CardContent>
              </Card>

              {/* Desktop App Section - Only show on web */}
              {!isElectron && (
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>Desktop App</CardTitle>
                    <CardDescription>
                      Install DrawdownDesk on your computer for a native experience.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Download the app, extract the zip, and run DrawdownDesk.exe.
                      Works offline with automatic sync when connected.
                    </p>
                    <a
                      href={DOWNLOAD_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                    >
                      Download for Windows
                    </a>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

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
                          <Label htmlFor="personal-allowance">Personal Allowance (£)</Label>
                          <Input
                            id="personal-allowance"
                            type="number"
                            value={allowance.amount}
                            onChange={(e) => setAllowanceState({ ...allowance, amount: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="taper-threshold">Taper Threshold (£)</Label>
                          <Input
                            id="taper-threshold"
                            type="number"
                            value={allowance.taperThreshold}
                            onChange={(e) => setAllowanceState({ ...allowance, taperThreshold: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="taper-rate">Taper Rate (%)</Label>
                        <Input
                          id="taper-rate"
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
                              <Label htmlFor={`band-start-${index}`}>Band Start (£)</Label>
                              <Input
                                id={`band-start-${index}`}
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
                              <Label htmlFor={`band-end-${index}`}>Band End (£, leave empty for unlimited)</Label>
                              <Input
                                id={`band-end-${index}`}
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
                              <Label htmlFor={`tax-rate-${index}`}>Tax Rate (%)</Label>
                              <Input
                                id={`tax-rate-${index}`}
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
                              <Label htmlFor={`ni-rate-${index}`}>National Insurance (%)</Label>
                              <Input
                                id={`ni-rate-${index}`}
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
                              <Label htmlFor={`cgt-exempt-${index}`}>Annual Exempt Amount (£)</Label>
                              <Input
                                id={`cgt-exempt-${index}`}
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
                              <Label htmlFor={`cgt-basic-${index}`}>Basic Rate (%)</Label>
                              <Input
                                id={`cgt-basic-${index}`}
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
                              <Label htmlFor={`cgt-higher-${index}`}>Higher Rate (%)</Label>
                              <Input
                                id={`cgt-higher-${index}`}
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

            {/* State Pension Tab */}
            <TabsContent value="statePension">
              <Card>
                <CardHeader>
                  <CardTitle>State Pension</CardTitle>
                  <CardDescription>
                    Your expected UK state pension amount and when you plan to receive it.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Retired Toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base" htmlFor="retirement-status">Retirement Status</Label>
                      <p className="text-sm text-muted-foreground">
                        Determines which tax bands to use in calculations
                      </p>
                    </div>
                    <div className="flex gap-1 bg-muted p-1 rounded-lg">
                      <Button
                        variant={!isRetired ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setIsRetired(false)}
                      >
                        Working
                      </Button>
                      <Button
                        variant={isRetired ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setIsRetired(true)}
                      >
                        Retired
                      </Button>
                    </div>
                  </div>

                  {editingStatePension ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="state-pension-amount">Annual State Pension (£)</Label>
                          <Input
                            id="state-pension-amount"
                            type="number"
                            value={statePension.amount}
                            onChange={(e) => setStatePension({ ...statePension, amount: parseFloat(e.target.value) || 0 })}
                          />
                          <p className="text-sm text-muted-foreground">
                            UK full new state pension (2025/26): £11,500
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="state-pension-age">State Pension Age</Label>
                          <Input
                            id="state-pension-age"
                            type="number"
                            value={statePension.age}
                            onChange={(e) => setStatePension({ ...statePension, age: parseInt(e.target.value) || 67 })}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleSaveStatePension} disabled={isSaving} className="gap-2">
                          <Check className="h-4 w-4" /> Save
                        </Button>
                        <Button variant="outline" onClick={() => setEditingStatePension(false)} className="gap-2">
                          <X className="h-4 w-4" /> Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Annual Amount:</span>
                          <p className="font-medium">£{statePension.amount.toLocaleString()}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Pension Age:</span>
                          <p className="font-medium">{statePension.age}</p>
                        </div>
                      </div>
                      <Button variant="outline" onClick={() => setEditingStatePension(true)} className="gap-2">
                        <Pencil className="h-4 w-4" /> Edit
                      </Button>
                    </div>
                  )}
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
