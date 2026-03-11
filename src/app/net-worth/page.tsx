"use client"

import { useEffect, useState, useMemo, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { Plus, Trash2, X, Link as LinkIcon } from "lucide-react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Account, AccountType, Portfolio } from "@/types/portfolios"
import { useQuery, useMutation } from "convex/react"
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock"
import { validateForm, commonRules, ValidationRule } from "@/lib/validation"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart
} from "recharts"
import { 
  Wallet, 
  PiggyBank, 
  TrendingUp, 
  TrendingDown, 
  CalendarDays,
  Building2,
  Landmark,
  Banknote,
  Coins,
  Folder,
  Filter,
  ArrowUpDown
} from "lucide-react"

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: "bank", label: "Bank Account" },
  { value: "savings", label: "Savings" },
  { value: "pension", label: "Pension" },
  { value: "crypto", label: "Crypto" },
  { value: "cash", label: "Cash" },
  { value: "other", label: "Other" },
]

type AccountWithPortfolio = Account & { portfolioName?: string }

export default function NetWorthPage() {
  const getAccountsData = useQuery(api.accounts.accountCrud.getUserAccounts)
  const getSnapshots = useQuery(api.netWorth.netWorthSnapshots.getNetWorthSnapshots, { months: 12 })
  const getUserPortfolio = useQuery(api.portfolio.getUserPortfolio.getUserPortfolio)
  const createAccountMutation = useMutation(api.accounts.accountCrud.createAccount)
  const updateAccountMutation = useMutation(api.accounts.accountCrud.updateAccount)
  const deleteAccountMutation = useMutation(api.accounts.accountCrud.deleteAccount)

  const [accounts, setAccounts] = useState<AccountWithPortfolio[]>([])
  const [portfolios, setPortfolios] = useState<Portfolio[]>([])
  const [portfolioHoldings, setPortfolioHoldings] = useState<{accountName: string, portfolios: { id: string, name: string }[], value: number}[]>([])
  const [showNewAccountForm, setShowNewAccountForm] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [filterType, setFilterType] = useState<AccountType | "all">("all")
  const [filterTag, setFilterTag] = useState<string>("all")
  const [filterPortfolio, setFilterPortfolio] = useState<string>("all")
  const [sortBy, setSortBy] = useState<"value" | "name" | "type">("value")

  // Form state
  const [newAccountName, setNewAccountName] = useState("")
  const [newAccountType, setNewAccountType] = useState<AccountType>("bank")
  const [newAccountTag, setNewAccountTag] = useState("")
  const [newAccountValue, setNewAccountValue] = useState("")
  const [newAccountPortfolioId, setNewAccountPortfolioId] = useState<string>("")
  const [newAccountNotes, setNewAccountNotes] = useState("")
  const [accountErrors, setAccountErrors] = useState<Record<string, string>>({})
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const accountsInitialized = useRef(false);
  useEffect(() => {
    if (getAccountsData && !('error' in getAccountsData) && !accountsInitialized.current) {
      accountsInitialized.current = true;
      setAccounts(getAccountsData.accounts as AccountWithPortfolio[])
      setPortfolios(getAccountsData.portfolios as Portfolio[])
    }
  }, [getAccountsData])

  // Prevent body scroll when modal is open
  useBodyScrollLock(showNewAccountForm)

  // Calculate totals by account type
  const totalAccountsValue = useMemo(() => accounts.reduce((sum, a) => sum + a.value, 0), [accounts])

  // Calculate total investments from portfolio holdings
  const totalInvestments = useMemo(() => portfolioHoldings.reduce((sum, p) => sum + p.value, 0), [portfolioHoldings])

  const totalNetWorth = useMemo(() => totalAccountsValue + totalInvestments, [totalAccountsValue, totalInvestments])

  // Calculate investment values from portfolio holdings - grouped by accountName and merged
  useEffect(() => {
    if (getUserPortfolio && !('error' in getUserPortfolio)) {
      // Collect all holdings by accountName, merging across portfolios
      type AccountEntry = { accountName: string, portfolios: { id: string, name: string }[], value: number }
      const accountValues: Map<string, AccountEntry> = new Map()

      for (const portfolio of getUserPortfolio) {
        const portfolioId = portfolio._id
        const portfolioName = portfolio.name

        // Process live holdings
        if (portfolio.holdings && portfolio.holdings.length > 0) {
          for (const holding of portfolio.holdings) {
            const currency = holding.currency || "GBP"
            const holdingValue = (holding.shares || 0) * (holding.currentPrice || 0)
            const gbpValue = currency === 'GBp' ? holdingValue / 100 : holdingValue

            const accountName = holding.accountName || "Unassigned"

            let existing = accountValues.get(accountName)
            if (!existing) {
              existing = {
                accountName,
                portfolios: [] as { id: string, name: string }[],
                value: 0
              }
              accountValues.set(accountName, existing)
            }
            existing.value += gbpValue
            // Add portfolio if not already present
            if (!existing.portfolios.some(p => p.id === String(portfolioId))) {
              existing.portfolios.push({ id: String(portfolioId), name: portfolioName })
            }
          }
        }

        // Process simple holdings
        if (portfolio.simpleHoldings && portfolio.simpleHoldings.length > 0) {
          for (const holding of portfolio.simpleHoldings) {
            const accountName = holding.accountName || holding.dataType || "Unassigned"

            let existing = accountValues.get(accountName)
            if (!existing) {
              existing = {
                accountName,
                portfolios: [] as { id: string, name: string }[],
                value: 0
              }
              accountValues.set(accountName, existing)
            }
            existing.value += holding.value || 0
            if (!existing.portfolios.some(p => p.id === String(portfolioId))) {
              existing.portfolios.push({ id: String(portfolioId), name: portfolioName })
            }
            accountValues.set(accountName, existing)
          }
        }
      }

      // Convert to array and filter out zero values
      const holdingsByAccount = Array.from(accountValues.values())
        .filter(item => item.value > 0)
        .sort((a, b) => b.value - a.value)

      setPortfolioHoldings(holdingsByAccount)
    }
  }, [getUserPortfolio])

  // Calculate growth and YTD from snapshots
  const { growthPercent, ytdPercent } = useMemo(() => {
    if (!getSnapshots || !Array.isArray(getSnapshots) || getSnapshots.length === 0) {
      return { growth: 0, growthPercent: 0, ytd: 0, ytdPercent: 0 }
    }

    // Sort snapshots by date
    const sortedSnapshots = [...getSnapshots].sort((a, b) =>
      new Date(a.snapshotDate).getTime() - new Date(b.snapshotDate).getTime()
    )

    const currentNetWorth = totalNetWorth
    const oldestSnapshot = sortedSnapshots[0]

    // Growth - from oldest snapshot to now
    const growth = currentNetWorth - (oldestSnapshot?.netWorth || 0)
    const growthPercent = oldestSnapshot?.netWorth ? (growth / oldestSnapshot.netWorth) * 100 : 0

    // YTD - find January 1st of current year
    const startOfYear = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]
    const ytdSnapshot = sortedSnapshots.find(s => s.snapshotDate >= startOfYear)
    const ytdStartValue = ytdSnapshot?.netWorth || currentNetWorth
    const ytd = currentNetWorth - ytdStartValue
    const ytdPercent = ytdStartValue ? (ytd / ytdStartValue) * 100 : 0

    return { growth, growthPercent, ytd, ytdPercent }
  }, [getSnapshots, totalNetWorth])

  // Get unique tags (memoized)
  const uniqueTags = useMemo(() =>
    [...new Set(accounts.map(a => a.tag).filter(Boolean))] as string[],
    [accounts]
  )

  // Get unique portfolios that have accounts linked (memoized)
  const portfoliosWithAccounts = useMemo(() =>
    portfolios.filter(p => accounts.some(a => a.portfolioId === p._id)),
    [portfolios, accounts]
  )

  // Filter and sort accounts (memoized to prevent recalculation on every render)
  const filteredAccounts = useMemo(() => {
    return accounts
      .filter(account => {
        if (filterType !== "all" && account.accountType !== filterType) return false
        if (filterTag !== "all" && account.tag !== filterTag) return false
        if (filterPortfolio !== "all" && account.portfolioId !== filterPortfolio) return false
        return true
      })
      .sort((a, b) => {
        if (sortBy === "value") return b.value - a.value
        if (sortBy === "name") return a.name.localeCompare(b.name)
        if (sortBy === "type") return a.accountType.localeCompare(b.accountType)
        return 0
      })
  }, [accounts, filterType, filterTag, filterPortfolio, sortBy])

  // Calculate total for filtered accounts (memoized)
  const filteredTotal = useMemo(() => {
    return filteredAccounts.reduce((sum, a) => sum + a.value, 0)
  }, [filteredAccounts])

  // Get the selected portfolio for banner
  const selectedPortfolio = filterPortfolio !== "all"
    ? portfolios.find(p => p._id === filterPortfolio)
    : null

  // Create account
  const addAccount = async () => {
    const validation = validateForm({
      name: newAccountName.trim(),
      value: parseFloat(newAccountValue) || 0,
    }, {
      name: [commonRules.required("Account name is required") as ValidationRule<unknown>, commonRules.minLength(2) as ValidationRule<unknown>],
      value: [commonRules.positiveNumber("Value must be greater than 0") as ValidationRule<unknown>],
    });

    if (!validation.isValid) {
      setAccountErrors(validation.errors);
      return;
    }

    setAccountErrors({});
    setIsSaving(true)
    try {
      const result = await createAccountMutation({
        name: newAccountName,
        accountType: newAccountType,
        tag: newAccountTag || undefined,
        value: parseFloat(newAccountValue),
        portfolioId: newAccountPortfolioId ? newAccountPortfolioId as Id<"portfolios"> : undefined,
        notes: newAccountNotes || undefined,
      })

      if (result && 'accountId' in result) {
        const newAccount: AccountWithPortfolio = {
          _id: result.accountId as Id<"accounts">,
          userId: "" as Id<"users">,
          name: newAccountName,
          accountType: newAccountType,
          tag: newAccountTag || undefined,
          value: parseFloat(newAccountValue),
          portfolioId: newAccountPortfolioId ? newAccountPortfolioId as Id<"portfolios"> : undefined,
          portfolioName: newAccountPortfolioId ? portfolios.find(p => p._id === newAccountPortfolioId)?.name : undefined,
          notes: newAccountNotes || undefined,
          lastUpdated: new Date().toISOString(),
        }

        setAccounts([...accounts, newAccount])
        resetForm()
      }
    } catch (error) {
      console.error("Failed to create account:", error)
      setFormError("Failed to create account. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  const resetForm = () => {
    setShowNewAccountForm(false)
    setNewAccountName("")
    setNewAccountType("bank")
    setNewAccountTag("")
    setNewAccountValue("")
    setNewAccountPortfolioId("")
    setNewAccountNotes("")
    setAccountErrors({})
    setFormError(null)
  }

  const clearAccountError = (field: string) => {
    if (accountErrors[field]) {
      setAccountErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Update account value inline
  const updateAccountValue = async (accountId: string, newValue: number) => {
    setAccounts(accounts.map(a =>
      a._id === accountId ? { ...a, value: newValue, lastUpdated: new Date().toISOString() } : a
    ))

    try {
      await updateAccountMutation({ id: accountId as Id<"accounts">, value: newValue })
    } catch (error) {
      console.error("Failed to update account:", error)
    }
  }

  // Delete account
  const confirmDeleteAccount = (accountId: string) => {
    setDeleteTargetId(accountId)
    setDeleteConfirmOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return

    setIsSaving(true)
    try {
      await deleteAccountMutation({ id: deleteTargetId as Id<"accounts"> })
      setAccounts(accounts.filter(a => a._id !== deleteTargetId))
    } catch (error) {
      console.error("Failed to delete account:", error)
    } finally {
      setDeleteConfirmOpen(false)
      setDeleteTargetId(null)
      setIsSaving(false)
    }
  }

  if (!getAccountsData) {
    return <LoadingSpinner message="Loading accounts…" fullScreen />
  }

  if ('error' in getAccountsData) {
    return <div>Error: {getAccountsData.error}</div>
  }

  return (
    <div className="flex min-h-screen bg-background">
      <main className="flex-1 overflow-y-auto overflow-x-hidden bg-background pr-4">
        <div className="p-4 lg:p-8 space-y-6">
          {/* Header Section */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Net Worth Display */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-600/20">
                <Wallet className="w-7 h-7 text-white" />
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Total Net Worth</div>
                <div className="text-4xl font-bold tracking-tight">
                  £{totalNetWorth.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {growthPercent >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-600" />
                  )}
                  <span className={`text-sm font-medium ${growthPercent >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {growthPercent >= 0 ? "+" : ""}{growthPercent.toFixed(1)}% 
                  </span>
                  <span className="text-sm text-muted-foreground">last 12 months</span>
                </div>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1 lg:max-w-3xl">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border border-blue-200/50 dark:border-blue-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Accounts</span>
                </div>
                <div className="text-2xl font-bold">{accounts.length}</div>
              </div>
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 border border-emerald-200/50 dark:border-emerald-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Investments</span>
                </div>
                <div className="text-2xl font-bold">£{totalInvestments.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20 border border-amber-200/50 dark:border-amber-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <PiggyBank className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Cash</span>
                </div>
                <div className="text-2xl font-bold">£{totalAccountsValue.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20 border border-purple-200/50 dark:border-purple-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <CalendarDays className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-xs font-medium text-purple-600 dark:text-purple-400">YTD</span>
                </div>
                <div className={`text-2xl font-bold ${ytdPercent >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                  {ytdPercent >= 0 ? "+" : ""}{ytdPercent.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                <Filter className="w-4 h-4" />
                Filters
              </div>
              <div className="flex items-center gap-1 bg-muted/50 dark:bg-muted/30 p-1 rounded-lg">
                {portfoliosWithAccounts.length > 0 && (
                  <Select value={filterPortfolio} onValueChange={(v: string) => setFilterPortfolio(v)}>
                    <SelectTrigger className="w-[140px] h-9 border-0 bg-transparent shadow-none focus:ring-0 text-sm" aria-label="Filter by portfolio">
                      <SelectValue placeholder="Portfolio" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Portfolios</SelectItem>
                      {portfoliosWithAccounts.map(p => (
                        <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <div className="w-px h-5 bg-border" />
                <Select value={filterType} onValueChange={(v: AccountType | "all") => setFilterType(v)}>
                  <SelectTrigger className="w-[120px] h-9 border-0 bg-transparent shadow-none focus:ring-0 text-sm" aria-label="Filter by account type">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {ACCOUNT_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {uniqueTags.length > 0 && (
                  <>
                    <div className="w-px h-5 bg-border" />
                    <Select value={filterTag} onValueChange={(v: string) => setFilterTag(v)}>
                      <SelectTrigger className="w-[120px] h-9 border-0 bg-transparent shadow-none focus:ring-0 text-sm" aria-label="Filter by tag">
                        <SelectValue placeholder="Tag" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Tags</SelectItem>
                        {uniqueTags.map(tag => (
                          <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <ArrowUpDown className="w-4 h-4" />
                <Select value={sortBy} onValueChange={(v: "value" | "name" | "type") => setSortBy(v)}>
                  <SelectTrigger className="w-[90px] h-9 border-0 bg-transparent shadow-none focus:ring-0 text-sm font-normal" aria-label="Sort by">
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="value">Value</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="type">Type</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(filterType !== "all" || filterTag !== "all" || filterPortfolio !== "all") && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setFilterType("all")
                    setFilterTag("all")
                    setFilterPortfolio("all")
                  }}
                  className="text-xs h-7 text-muted-foreground hover:text-foreground"
                >
                  Clear filters
                </Button>
              )}
            </div>
            <Button onClick={() => setShowNewAccountForm(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Account
            </Button>
          </div>

          {/* Accounts Table */}
          <Card className="overflow-hidden">
            <div className="px-6 py-4 border-b bg-muted/20 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Accounts & Investments</h3>
                <p className="text-sm text-muted-foreground">
                  {filteredAccounts.length + portfolioHoldings.length} total • £{filteredTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })} filtered
                </p>
              </div>
            </div>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-muted/30">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Account</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Portfolio</th>
                      <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Value</th>
                      <th className="px-6 py-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredAccounts.length === 0 && portfolioHoldings.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-16 text-center">
                          <div className="flex flex-col items-center max-w-sm mx-auto">
                            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
                              <Wallet className="w-7 h-7 text-muted-foreground" />
                            </div>
                            <p className="text-lg font-semibold mb-2">
                              {accounts.length === 0
                                ? "No accounts yet"
                                : "No accounts match your filters"}
                            </p>
                            <p className="text-sm text-muted-foreground mb-6 text-center">
                              {accounts.length === 0
                                ? "Add your first account to start tracking your net worth."
                                : "Try adjusting your filter criteria."}
                            </p>
                            {accounts.length === 0 && (
                              <Button onClick={() => setShowNewAccountForm(true)} className="gap-2">
                                <Plus className="h-4 w-4" />
                                Add Account
                              </Button>
                            )}
                            {accounts.length > 0 && (filterType !== "all" || filterTag !== "all" || filterPortfolio !== "all") && (
                              <Button variant="outline" onClick={() => {
                                setFilterType("all")
                                setFilterTag("all")
                                setFilterPortfolio("all")
                              }} className="gap-2">
                                Clear Filters
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredAccounts.map(account => (
                        <tr key={account._id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-medium">{account.name}</div>
                            {account.notes && <div className="text-xs text-muted-foreground mt-0.5">{account.notes}</div>}
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1.5 text-sm">
                              {account.accountType === "bank" && <Landmark className="w-4 h-4 text-blue-600" />}
                              {account.accountType === "savings" && <PiggyBank className="w-4 h-4 text-emerald-600" />}
                              {account.accountType === "pension" && <Coins className="w-4 h-4 text-amber-600" />}
                              {account.accountType === "crypto" && <Coins className="w-4 h-4 text-purple-600" />}
                              {account.accountType === "cash" && <Banknote className="w-4 h-4 text-green-600" />}
                              {account.accountType === "other" && <Folder className="w-4 h-4 text-gray-600" />}
                              {ACCOUNT_TYPES.find(t => t.value === account.accountType)?.label}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {account.portfolioId ? (
                              <Link
                                href={`/holdings/${account.portfolioId}`}
                                className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                              >
                                {account.portfolioName || "Portfolio"}
                              </Link>
                            ) : account.tag ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-secondary text-secondary-foreground text-xs font-medium">
                                {account.tag}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Input
                              type="number"
                              step="0.01"
                              value={account.value}
                              onChange={(e) => updateAccountValue(account._id, parseFloat(e.target.value) || 0)}
                              className="w-32 text-right inline-flex h-9"
                            />
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => confirmDeleteAccount(account._id)}
                              className="hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}

                    {/* Divider between manual accounts and investments */}
                    {portfolioHoldings.length > 0 && filteredAccounts.length > 0 && (
                      <tr>
                        <td colSpan={5} className="border-t-2 border-dashed border-muted-foreground/20 px-6 py-2">
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Investment Holdings</span>
                        </td>
                      </tr>
                    )}

                    {/* Investment rows - automatically managed from holdings */}
                    {portfolioHoldings.map(item => (
                      <tr key={item.accountName} className="hover:bg-muted/30 transition-colors bg-muted/10">
                        <td className="px-6 py-4">
                          <div className="font-medium flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-emerald-600" />
                            {item.accountName}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 text-sm">
                            <TrendingUp className="w-4 h-4 text-emerald-600" />
                            Investment
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {item.portfolios.map((portfolio, idx) => (
                              <Link
                                key={idx}
                                href={`/holdings/${portfolio.id}`}
                                className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
                              >
                                {portfolio.name}
                              </Link>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right font-semibold">
                          £{item.value.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4"></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Net Worth Over Time Chart */}
          {getSnapshots && !('error' in getSnapshots) && getSnapshots.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-blue-600" />
                      Net Worth Over Time
                    </CardTitle>
                    <CardDescription>Track your total wealth including investments and accounts</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="[&_.recharts-cartesian-axis-tick_text]:!fill-muted-foreground">
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={getSnapshots} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorInvestments" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#16a34a" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorAccounts" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#9333ea" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#9333ea" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                    <XAxis
                      dataKey="snapshotDate"
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return date.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
                      }}
                      tickLine={false}
                      axisLine={false}
                      dy={10}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                      tickFormatter={(value) => `£${(value / 1000).toFixed(0)}k`}
                      tickLine={false}
                      axisLine={false}
                      width={60}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        return (
                          <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg text-sm">
                            <div className="font-semibold mb-1">
                              {new Date(label).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
                            </div>
                            {payload.map((entry: { dataKey?: string | number; value?: number | string | (string | number)[]; color?: string }) => (
                              <div key={String(entry.dataKey)} className="flex justify-between gap-4">
                                <span className="text-muted-foreground flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
                                  {entry.dataKey === "netWorth" ? "Net Worth" : entry.dataKey === "investmentsValue" ? "Investments" : "Accounts"}
                                </span>
                                <span className="font-medium">£{(entry.value ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                              </div>
                            ))}
                          </div>
                        );
                      }}
                    />
                    <Legend 
                      wrapperStyle={{ paddingTop: "20px" }}
                      formatter={(value) => <span className="text-sm font-medium text-foreground">{value}</span>}
                    />
                    <Area
                      type="monotone"
                      dataKey="netWorth"
                      name="Net Worth"
                      stroke="#2563eb"
                      strokeWidth={2}
                      fill="url(#colorNetWorth)"
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 2 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="investmentsValue"
                      name="Investments"
                      stroke="#16a34a"
                      strokeWidth={2}
                      fill="url(#colorInvestments)"
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 2 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="accountsValue"
                      name="Accounts"
                      stroke="#9333ea"
                      strokeWidth={2}
                      fill="url(#colorAccounts)"
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Portfolio Banner */}
          {selectedPortfolio && (
            <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border border-blue-200/50 dark:border-blue-800/50 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                  <LinkIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <Link href={`/holdings/${selectedPortfolio._id}`} className="font-semibold hover:underline text-foreground">
                    {selectedPortfolio.name}
                  </Link>
                  <div className="text-sm text-muted-foreground">
                    {filteredAccounts.length} account{filteredAccounts.length !== 1 ? "s" : ""} • £{filteredTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })} total
                  </div>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setFilterPortfolio("all")} className="gap-1.5">
                View All
              </Button>
            </div>
          )}

          {/* New Account Form Modal */}
          {showNewAccountForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <Card className="w-full max-w-md mx-4 shadow-2xl">
                <CardHeader className="pb-4 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <Wallet className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold">Add New Account</h2>
                        <p className="text-sm text-muted-foreground">Track a new asset or account</p>
                      </div>
                    </div>
                    <button onClick={resetForm} className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg p-2 transition-colors">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-5">
                  <div>
                    <label htmlFor="account-name" className="text-sm font-medium">Account Name</label>
                    <Input
                      id="account-name"
                      placeholder="e.g., NatWest Current Account"
                      value={newAccountName}
                      onChange={(e) => {
                        setNewAccountName(e.target.value);
                        clearAccountError("name");
                      }}
                      className={`mt-1.5 ${accountErrors.name ? "border-red-500" : ""}`}
                    />
                    {accountErrors.name && <p className="text-xs text-red-500 mt-1">{accountErrors.name}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="account-type" className="text-sm font-medium">Account Type</label>
                      <Select value={newAccountType} onValueChange={(v: AccountType) => setNewAccountType(v)}>
                        <SelectTrigger id="account-type" className="mt-1.5" aria-label="Select account type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ACCOUNT_TYPES.map(type => (
                            <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label htmlFor="account-value" className="text-sm font-medium">Current Value (£)</label>
                      <Input
                        id="account-value"
                        type="number"
                        step="0.01"
                        placeholder="1000.00"
                        value={newAccountValue}
                        onChange={(e) => {
                          setNewAccountValue(e.target.value);
                          clearAccountError("value");
                        }}
                        className={`mt-1.5 ${accountErrors.value ? "border-red-500" : ""}`}
                      />
                      {accountErrors.value && <p className="text-xs text-red-500 mt-1">{accountErrors.value}</p>}
                    </div>
                  </div>
                  <div>
                    <label htmlFor="account-tag" className="text-sm font-medium">Purpose Tag <span className="text-muted-foreground font-normal">(optional)</span></label>
                    <Input
                      id="account-tag"
                      placeholder="e.g., Emergency Fund, House Fund"
                      value={newAccountTag}
                      onChange={(e) => setNewAccountTag(e.target.value)}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <label htmlFor="account-portfolio" className="text-sm font-medium">Link to Portfolio <span className="text-muted-foreground font-normal">(optional)</span></label>
                    <Select value={newAccountPortfolioId || "none"} onValueChange={(v) => setNewAccountPortfolioId(v === "none" ? "" : v)}>
                      <SelectTrigger id="account-portfolio" className="mt-1.5" aria-label="Select portfolio to link">
                        <SelectValue placeholder="Select a portfolio" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {portfolios.map(p => (
                          <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      Link to a portfolio to easily import holdings
                    </p>
                  </div>
                  <div>
                    <label htmlFor="account-notes" className="text-sm font-medium">Notes <span className="text-muted-foreground font-normal">(optional)</span></label>
                    <Input
                      id="account-notes"
                      placeholder="Any additional notes"
                      value={newAccountNotes}
                      onChange={(e) => setNewAccountNotes(e.target.value)}
                      className="mt-1.5"
                    />
                  </div>
                  {formError && (
                    <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm" role="alert">
                      {formError}
                    </div>
                  )}
                  <div className="flex gap-3 pt-2">
                    <Button variant="outline" onClick={resetForm} className="flex-1">
                      Cancel
                    </Button>
                    <Button onClick={addAccount} disabled={isSaving || !newAccountName.trim() || !newAccountValue} className="flex-1">
                      {isSaving ? (
                        <>
                          <LoadingSpinner className="w-4 h-4 mr-2" />
                          Adding...
                        </>
                      ) : (
                        "Add Account"
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Account</AlertDialogTitle>
            </AlertDialogHeader>
            <p className="text-muted-foreground">Are you sure you want to delete this account? This action cannot be undone.</p>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  )
}
