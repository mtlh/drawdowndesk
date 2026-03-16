"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Settings as SettingsIcon, RotateCcw, Pencil, Check, X, Moon, Sun, Shield, Trash2, LogOut, Smartphone, KeyRound, ChevronLeft, ChevronRight } from "lucide-react"
import Image from "next/image"
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

  // Password change
  const changePassword = useMutation(api.auth.changePassword.changePassword)
  
  // Security - account info
  const accountInfo = useQuery(api.auth.security.getUserAccountInfo)
  const invalidateOtherSessions = useMutation(api.auth.security.invalidateOtherSessions)
  const deleteAccount = useMutation(api.auth.security.deleteAccount)

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

  // Assumptions settings
  const [assumptions, setAssumptions] = useState({ growthRate: 5, inflationRate: 2 })
  const [editingAssumptions, setEditingAssumptions] = useState(false)

  const [isSaving, setIsSaving] = useState(false)

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  // Session management
  const [isLoggingOutSessions, setIsLoggingOutSessions] = useState(false)
  const [sessionMessage, setSessionMessage] = useState("")
  const [sessionPage, setSessionPage] = useState(1)
  const SESSIONS_PER_PAGE = 3

  // Delete account
  const [deleteConfirmStep, setDeleteConfirmStep] = useState(0)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)

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
      setAssumptions({
        growthRate: userSettings.defaultGrowthRate ?? 5,
        inflationRate: userSettings.defaultInflationRate ?? 2,
      })
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
    } catch (error) {
      console.error("Failed to save personal allowance:", error)
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
    } catch (error) {
      console.error("Failed to reset personal allowance:", error)
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
    } catch (error) {
      console.error("Failed to save tax band:", error)
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
    } catch (error) {
      console.error("Failed to reset tax band:", error)
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
    } catch (error) {
      console.error("Failed to save CGT:", error)
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
    } catch (error) {
      console.error("Failed to reset CGT:", error)
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
    } catch (error) {
      console.error("Failed to save state pension settings:", error)
      setSavedMessage("Error saving state pension settings")
    }
    setIsSaving(false)
    setTimeout(() => setSavedMessage(""), 3000)
  }

  const handleSaveAssumptions = async () => {
    if (!user) return
    setIsSaving(true)
    try {
      await saveUserSettings({
        userId: user._id as Id<"users">,
        statePensionAmount: statePension.amount,
        statePensionAge: statePension.age,
        isRetired: isRetired,
        defaultGrowthRate: assumptions.growthRate,
        defaultInflationRate: assumptions.inflationRate,
      })
      setSavedMessage("Assumptions saved!")
      setEditingAssumptions(false)
    } catch (error) {
      console.error("Failed to save assumptions:", error)
      setSavedMessage("Error saving assumptions")
    }
    setIsSaving(false)
    setTimeout(() => setSavedMessage(""), 3000)
  }

  if (!user) {
    return <LoadingSpinner fullScreen message="Loading..." />
  }

  return (
    <div className="flex h-screen bg-background">
      <main className="flex-1 overflow-y-auto overflow-x-hidden bg-background pr-4">
        <div className="p-8 max-w-6xl mx-auto space-y-8">
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
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 px-4 py-2 rounded-md">
              {savedMessage}
            </div>
          )}

          <Tabs defaultValue="allowance" className="w-full">
            <TabsList className="flex w-full overflow-x-auto">
              <TabsTrigger value="appearance" className="shrink-0">Appearance</TabsTrigger>
              <TabsTrigger value="security" className="shrink-0">Security</TabsTrigger>
              <TabsTrigger value="allowance" className="shrink-0">Personal Allowance</TabsTrigger>
              <TabsTrigger value="bands" className="shrink-0">Tax Bands</TabsTrigger>
              <TabsTrigger value="cgt" className="shrink-0">Capital Gains Tax</TabsTrigger>
              <TabsTrigger value="statePension" className="shrink-0">State Pension</TabsTrigger>
              <TabsTrigger value="assumptions" className="shrink-0">Assumptions</TabsTrigger>
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

            {/* Security Tab */}
            <TabsContent value="security">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Security
                  </CardTitle>
                  <CardDescription>
                    Manage your account security settings.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Column - Login Methods & Sessions */}
                    <div className="space-y-6">
                      {/* Login Methods & Connected Accounts */}
                      <div className="space-y-4">
                        <h4 className="text-sm font-medium flex items-center gap-2">
                          <KeyRound className="h-4 w-4" />
                          Login Methods & Connected Accounts
                        </h4>
                        <div className="space-y-2">
                          {accountInfo?.accounts.map((account) => (
                            <div
                              key={account._id}
                              className="flex items-center justify-between p-3 rounded-lg border bg-muted/50"
                            >
                              <div className="flex items-center gap-3">
                                {account.provider === "password" ? (
                                  <KeyRound className="h-4 w-4 text-muted-foreground" />
                                ) : account.provider === "google" ? (
                                  <div className="h-4 w-4 flex items-center justify-center">
                                    <Image 
                                      src="https://www.google.com/favicon.ico" 
                                      alt="Google" 
                                      width={16} 
                                      height={16}
                                      unoptimized
                                    />
                                  </div>
                                ) : (
                                  <Smartphone className="h-4 w-4 text-muted-foreground" />
                                )}
                                <div>
                                  <p className="text-sm font-medium capitalize">
                                    {account.provider === "password" ? "Email & Password" : account.provider}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Connected {new Date(account.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              {account.provider === "password" && (
                                <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-1 rounded">
                                  Active
                                </span>
                              )}
                            </div>
                          ))}
                          {(!accountInfo?.accounts || accountInfo.accounts.length === 0) && (
                            <p className="text-sm text-muted-foreground">No connected accounts</p>
                          )}
                        </div>
                      </div>

                      {/* Sessions */}
                      <div className="space-y-4">
                        <h4 className="text-sm font-medium flex items-center gap-2">
                          <Smartphone className="h-4 w-4" />
                          Active Sessions
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Manage your active sessions across devices.
                        </p>
                        <div className="space-y-2">
                          {accountInfo?.sessions
                            .slice((sessionPage - 1) * SESSIONS_PER_PAGE, sessionPage * SESSIONS_PER_PAGE)
                            .map((session) => (
                            <div
                              key={session._id}
                              className="flex items-center justify-between p-3 rounded-lg border bg-muted/50"
                            >
                              <div>
                                <p className="text-sm font-medium">
                                  {session.isCurrentSession ? "This device" : "Other device"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Signed in {new Date(session.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                              {session.isCurrentSession && (
                                <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-1 rounded">
                                  Current
                                </span>
                              )}
                            </div>
                          ))}
                          {(!accountInfo?.sessions || accountInfo.sessions.length === 0) && (
                            <p className="text-sm text-muted-foreground">No active sessions</p>
                          )}
                        </div>
                        {/* Pagination */}
                        {accountInfo && accountInfo.sessions.length > SESSIONS_PER_PAGE && (
                          <div className="flex items-center justify-between pt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSessionPage(p => Math.max(1, p - 1))}
                              disabled={sessionPage === 1}
                            >
                              <ChevronLeft className="h-4 w-4" />
                              Previous
                            </Button>
                            <span className="text-sm text-muted-foreground">
                              Page {sessionPage} of {Math.ceil(accountInfo.sessions.length / SESSIONS_PER_PAGE)}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSessionPage(p => Math.min(Math.ceil(accountInfo.sessions.length / SESSIONS_PER_PAGE), p + 1))}
                              disabled={sessionPage >= Math.ceil(accountInfo.sessions.length / SESSIONS_PER_PAGE)}
                            >
                              Next
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                        {accountInfo && accountInfo.sessions.length > 1 && (
                          <Button
                            variant="outline"
                            onClick={async () => {
                              setIsLoggingOutSessions(true)
                              setSessionMessage("")
                              try {
                                await invalidateOtherSessions()
                                setSessionMessage("All other sessions have been logged out")
                              } catch (error) {
                                setSessionMessage(error instanceof Error ? error.message : "Failed to logout sessions")
                              } finally {
                                setIsLoggingOutSessions(false)
                              }
                            }}
                            disabled={isLoggingOutSessions}
                            className="gap-2"
                          >
                            <LogOut className="h-4 w-4" />
                            {isLoggingOutSessions ? "Logging out..." : "Log Out All Other Devices"}
                          </Button>
                        )}
                        {sessionMessage && (
                          <p className={`text-sm ${sessionMessage.includes("Failed") ? "text-red-500" : "text-emerald-500"}`}>
                            {sessionMessage}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right Column - Password & Delete */}
                    <div className="space-y-6">
                      {/* Change Password */}
                      <div className="space-y-4">
                        <h4 className="text-sm font-medium">Change Password</h4>
                        <p className="text-sm text-muted-foreground">
                          Enter your current password and choose a new password.
                        </p>
                        
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <Label htmlFor="current-password">Current Password</Label>
                            <Input
                              id="current-password"
                              type="password"
                              value={currentPassword}
                              onChange={(e) => {
                                setCurrentPassword(e.target.value)
                                setPasswordError("")
                                setPasswordSuccess(false)
                              }}
                              placeholder="Enter current password"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="new-password">New Password</Label>
                            <Input
                              id="new-password"
                              type="password"
                              value={newPassword}
                              onChange={(e) => {
                                setNewPassword(e.target.value)
                                setPasswordError("")
                                setPasswordSuccess(false)
                              }}
                              placeholder="Enter new password"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="confirm-password">Confirm New Password</Label>
                            <Input
                              id="confirm-password"
                              type="password"
                              value={confirmPassword}
                              onChange={(e) => {
                                setConfirmPassword(e.target.value)
                                setPasswordError("")
                                setPasswordSuccess(false)
                              }}
                              placeholder="Confirm new password"
                            />
                          </div>
                          
                          {passwordError && (
                            <p className="text-sm text-red-500">{passwordError}</p>
                          )}
                          
                          {passwordSuccess && (
                            <p className="text-sm text-emerald-500">Password changed successfully!</p>
                          )}
                          
                          <Button
                            onClick={async () => {
                              setPasswordError("")
                              setPasswordSuccess(false)
                              
                              if (!currentPassword) {
                                setPasswordError("Please enter your current password")
                                return
                              }
                              
                              if (!newPassword) {
                                setPasswordError("Please enter a new password")
                                return
                              }
                              
                              if (newPassword.length < 8) {
                                setPasswordError("New password must be at least 8 characters")
                                return
                              }
                              
                              if (newPassword !== confirmPassword) {
                                setPasswordError("New passwords do not match")
                                return
                              }
                              
                              setIsChangingPassword(true)
                              try {
                                await changePassword({
                                  currentPassword,
                                  newPassword,
                                })
                                setCurrentPassword("")
                                setNewPassword("")
                                setConfirmPassword("")
                                setPasswordSuccess(true)
                              } catch (error) {
                                setPasswordError(error instanceof Error ? error.message : "Failed to change password")
                              } finally {
                                setIsChangingPassword(false)
                              }
                            }}
                            disabled={isChangingPassword}
                            className="gap-2"
                          >
                            {isChangingPassword ? "Changing..." : "Change Password"}
                          </Button>
                        </div>
                      </div>

                      {/* Delete Account */}
                      <div className="space-y-4 pt-4 border-t">
                        <h4 className="text-sm font-medium text-red-600 dark:text-red-400 flex items-center gap-2">
                          <Trash2 className="h-4 w-4" />
                          Delete Account
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Permanently delete your account and all associated data. This action cannot be undone.
                        </p>
                        
                        {deleteConfirmStep === 0 && (
                          <Button
                            variant="destructive"
                            onClick={() => setDeleteConfirmStep(1)}
                            className="gap-2"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete Account
                          </Button>
                        )}
                        
                        {deleteConfirmStep === 1 && (
                          <div className="space-y-3 p-4 border border-red-300 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-950/30">
                            <p className="text-sm font-medium text-red-700 dark:text-red-300">
                              Step 1 of 3: Are you sure you want to delete your account?
                            </p>
                            <p className="text-xs text-red-600 dark:text-red-400">
                              All your data will be permanently deleted and cannot be recovered.
                            </p>
                            <div className="flex gap-2">
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setDeleteConfirmStep(2)}
                              >
                                Yes, continue
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setDeleteConfirmStep(0)
                                  setDeleteConfirmText("")
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}
                        
                        {deleteConfirmStep === 2 && (
                          <div className="space-y-3 p-4 border border-red-300 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-950/30">
                            <p className="text-sm font-medium text-red-700 dark:text-red-300">
                              Step 2 of 3: Type <span className="font-mono bg-red-100 dark:bg-red-900 px-1 rounded">DELETE</span> to confirm
                            </p>
                            <Input
                              value={deleteConfirmText}
                              onChange={(e) => setDeleteConfirmText(e.target.value)}
                              placeholder="Type DELETE"
                              className="max-w-xs"
                            />
                            <div className="flex gap-2">
                              <Button
                                variant="destructive"
                                size="sm"
                                disabled={deleteConfirmText !== "DELETE"}
                                onClick={() => setDeleteConfirmStep(3)}
                              >
                                Continue
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setDeleteConfirmStep(0)
                                  setDeleteConfirmText("")
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}
                        
                        {deleteConfirmStep === 3 && (
                          <div className="space-y-3 p-4 border-2 border-red-500 rounded-lg bg-red-50 dark:bg-red-950/30">
                            <p className="text-sm font-medium text-red-700 dark:text-red-300">
                              Step 3 of 3: Enter your password to confirm deletion
                            </p>
                            <Input
                              type="password"
                              value={currentPassword}
                              onChange={(e) => setCurrentPassword(e.target.value)}
                              placeholder="Enter your password"
                              className="max-w-xs"
                            />
                            <div className="flex gap-2">
                              <Button
                                variant="destructive"
                                size="sm"
                                disabled={!currentPassword || isDeleting}
                                onClick={async () => {
                                  setIsDeleting(true)
                                  try {
                                    await deleteAccount()
                                    window.location.href = "/"
                                  } catch (error) {
                                    alert(error instanceof Error ? error.message : "Failed to delete account")
                                  } finally {
                                    setIsDeleting(false)
                                  }
                                }}
                              >
                                {isDeleting ? "Deleting..." : "Confirm Delete Account"}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setDeleteConfirmStep(0)
                                  setDeleteConfirmText("")
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
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

            {/* Assumptions Tab */}
            <TabsContent value="assumptions">
              <Card>
                <CardHeader>
                  <CardTitle>Assumptions</CardTitle>
                  <CardDescription>
                    Default assumptions used for projections and forecasts across the application.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {editingAssumptions ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="growth-rate">Default Growth Rate (%)</Label>
                          <Input
                            id="growth-rate"
                            type="number"
                            value={assumptions.growthRate}
                            onChange={(e) => setAssumptions({ ...assumptions, growthRate: parseFloat(e.target.value) || 0 })}
                          />
                          <p className="text-sm text-muted-foreground">
                            Expected annual investment growth (e.g., 5%)
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="inflation-rate">Default Inflation Rate (%)</Label>
                          <Input
                            id="inflation-rate"
                            type="number"
                            value={assumptions.inflationRate}
                            onChange={(e) => setAssumptions({ ...assumptions, inflationRate: parseFloat(e.target.value) || 0 })}
                          />
                          <p className="text-sm text-muted-foreground">
                            Expected annual inflation (e.g., 2%)
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleSaveAssumptions} disabled={isSaving} className="gap-2">
                          <Check className="h-4 w-4" /> Save
                        </Button>
                        <Button variant="outline" onClick={() => setEditingAssumptions(false)} className="gap-2">
                          <X className="h-4 w-4" /> Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Growth Rate:</span>
                          <p className="font-medium">{assumptions.growthRate}%</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Inflation Rate:</span>
                          <p className="font-medium">{assumptions.inflationRate}%</p>
                        </div>
                      </div>
                      <Button variant="outline" onClick={() => setEditingAssumptions(true)} className="gap-2">
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
