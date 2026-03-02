"use client"

import { useEffect, useState, useMemo, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { Plus, Trash2, X, Link as LinkIcon } from "lucide-react"
import { StatCard } from "@/components/ui/stat-card"
import { Account, AccountType, Portfolio } from "@/types/portfolios"
import { useQuery, useMutation } from "convex/react"
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts"

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: "bank", label: "Bank Account" },
  { value: "savings", label: "Savings" },
  { value: "pension", label: "Pension" },
  { value: "crypto", label: "Crypto" },
  { value: "cash", label: "Cash" },
  { value: "other", label: "Other" },
]

const ACCOUNT_TYPE_ICONS: Record<AccountType, string> = {
  bank: "🏦",
  savings: "💰",
  pension: "🏖️",
  crypto: "₿",
  cash: "💵",
  other: "📁",
}

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
            const accountName = holding.accountName || holding.holdingType || "Unassigned"

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

  // Get unique tags
  const uniqueTags = [...new Set(accounts.map(a => a.tag).filter(Boolean))] as string[]

  // Get unique portfolios that have accounts linked
  const portfoliosWithAccounts = portfolios.filter(p => accounts.some(a => a.portfolioId === p._id))

  // Filter and sort accounts
  const filteredAccounts = accounts
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

  // Calculate total for filtered accounts
  const filteredTotal = filteredAccounts.reduce((sum, a) => sum + a.value, 0)

  // Get the selected portfolio for banner
  const selectedPortfolio = filterPortfolio !== "all"
    ? portfolios.find(p => p._id === filterPortfolio)
    : null

  // Create account
  const addAccount = async () => {
    if (!newAccountName.trim() || !newAccountValue) {
      alert("Please enter account name and value")
      return
    }

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
      alert("Failed to create account. Please try again.")
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
  }

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
  const deleteAccount = async (accountId: string) => {
    if (!confirm("Are you sure you want to delete this account?")) return

    setIsSaving(true)
    try {
      await deleteAccountMutation({ id: accountId as Id<"accounts"> })
      setAccounts(accounts.filter(a => a._id !== accountId))
    } catch (error) {
      console.error("Failed to delete account:", error)
      alert("Failed to delete account. Please try again.")
    } finally {
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
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          <div className="mb-8 flex items-center justify-between gap-4 flex-wrap">
            {/* Net Worth - Left */}
            <div>
              <div className="text-sm text-muted-foreground">Net Worth</div>
              <div className="text-3xl font-bold">
                £{totalNetWorth.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </div>
            </div>

            {/* Quick Stats Cards */}
            <div className="flex items-center gap-3 flex-wrap">
              <StatCard
                icon="🏦"
                label="Accounts"
                value={`${accounts.length}`}
                className="from-primary/5 border-primary/20"
              />
              <StatCard
                icon="📈"
                label="Investments"
                value={`£${totalInvestments.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                className="from-emerald-500/5 border-emerald-500/20"
              />
              <StatCard
                icon="💰"
                label="Cash"
                value={`£${totalAccountsValue.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                className="from-blue-500/5 border-blue-500/20"
              />
              <StatCard
                icon="📊"
                label="Growth"
                value={`${growthPercent >= 0 ? "+" : ""}${growthPercent.toFixed(1)}%`}
                valueColor={growthPercent >= 0 ? "text-emerald-600" : "text-red-600"}
                className="from-amber-500/5 border-amber-500/20"
              />
              <StatCard
                icon="📅"
                label="YTD"
                value={`${ytdPercent >= 0 ? "+" : ""}${ytdPercent.toFixed(1)}%`}
                valueColor={ytdPercent >= 0 ? "text-emerald-600" : "text-red-600"}
                className="from-purple-500/5 border-purple-500/20"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="mb-6 flex gap-3 items-center flex-wrap">
            <div className="flex items-center gap-2 bg-muted/50 p-1.5 rounded-lg">
              {portfoliosWithAccounts.length > 0 && (
                <Select value={filterPortfolio} onValueChange={(v: string) => setFilterPortfolio(v)}>
                  <SelectTrigger className="w-[150px] h-8 border-0 bg-transparent shadow-none focus:ring-0">
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
              <div className="w-px h-6 bg-border" />
              <Select value={filterType} onValueChange={(v: AccountType | "all") => setFilterType(v)}>
                <SelectTrigger className="w-[130px] h-8 border-0 bg-transparent shadow-none focus:ring-0">
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
                  <div className="w-px h-6 bg-border" />
                  <Select value={filterTag} onValueChange={(v: string) => setFilterTag(v)}>
                    <SelectTrigger className="w-[130px] h-8 border-0 bg-transparent shadow-none focus:ring-0">
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
              <div className="w-px h-6 bg-border" />
              <Select value={sortBy} onValueChange={(v: "value" | "name" | "type") => setSortBy(v)}>
                <SelectTrigger className="w-[100px] h-8 border-0 bg-transparent shadow-none focus:ring-0">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="value">Value</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="type">Type</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => setShowNewAccountForm(true)} className="gap-2 ml-auto">
              <Plus className="h-4 w-4" />
              Add Account
            </Button>
          </div>

          {/* Accounts Table */}
          <Card className="mb-8">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="text-left p-3 text-sm font-medium">Account</th>
                      <th className="text-left p-3 text-sm font-medium">Type</th>
                      <th className="text-left p-3 text-sm font-medium">Portfolio</th>
                      <th className="text-right p-3 text-sm font-medium">Value</th>
                      <th className="p-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAccounts.length === 0 && portfolioHoldings.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-12 text-center">
                          <div className="flex flex-col items-center">
                            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                              <span className="text-3xl">🏦</span>
                            </div>
                            <p className="text-lg font-medium mb-2">
                              {accounts.length === 0
                                ? "No accounts yet"
                                : "No accounts match your filters"}
                            </p>
                            <p className="text-muted-foreground mb-6">
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
                        <tr key={account._id} className="border-b">
                          <td className="p-3">
                            <div className="font-medium">{account.name}</div>
                            {account.notes && <div className="text-xs text-muted-foreground">{account.notes}</div>}
                          </td>
                          <td className="p-3">
                            <span className="inline-flex items-center gap-1">
                              {ACCOUNT_TYPE_ICONS[account.accountType]}
                              {ACCOUNT_TYPES.find(t => t.value === account.accountType)?.label}
                            </span>
                          </td>
                          <td className="p-3">
                            {account.portfolioId ? (
                              <Link
                                href={`/holdings/${account.portfolioId}`}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20"
                              >
                                {account.portfolioName || "Portfolio"}
                              </Link>
                            ) : account.tag ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full bg-primary/10 text-xs font-medium">
                                {account.tag}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <Input
                              type="number"
                              step="0.01"
                              value={account.value}
                              onChange={(e) => updateAccountValue(account._id, parseFloat(e.target.value) || 0)}
                              className="w-32 text-right inline-flex"
                            />
                          </td>
                          <td className="p-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteAccount(account._id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}

                    {/* Divider between manual accounts and investments */}
                    {portfolioHoldings.length > 0 && filteredAccounts.length > 0 && (
                      <tr>
                        <td colSpan={5} className="border-t-2 border-dashed border-muted-foreground/30 p-2"></td>
                      </tr>
                    )}

                    {/* Investment rows - automatically managed from holdings */}
                    {portfolioHoldings.map(item => (
                      <tr key={item.accountName} className="border-b">
                        <td className="p-3">
                          <div className="font-medium">{item.accountName}</div>
                        </td>
                        <td className="p-3">
                          <span className="inline-flex items-center gap-1">
                            📈 Investment
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {item.portfolios.map((portfolio, idx) => (
                              <Link
                                key={idx}
                                href={`/holdings/${portfolio.id}`}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20"
                              >
                                {portfolio.name}
                              </Link>
                            ))}
                          </div>
                        </td>
                        <td className="p-3 text-right font-medium">
                          £{item.value.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3"></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Net Worth Over Time Chart */}
          {getSnapshots && !('error' in getSnapshots) && getSnapshots.length > 0 && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-lg">Net Worth Over Time</CardTitle>
                <CardDescription>Track your total wealth including investments and accounts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="[&_.recharts-cartesian-axis-tick_text]:!fill-muted-foreground">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={getSnapshots} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
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
                            {payload.map((entry: { dataKey?: string | number; value?: number | string | (string | number)[] }) => (
                              <div key={String(entry.dataKey)} className="flex justify-between gap-4">
                                <span className="text-muted-foreground">{entry.dataKey === "netWorth" ? "Net Worth" : entry.dataKey === "investmentsValue" ? "Investments" : "Accounts"}:</span>
                                <span className="font-medium">£{(entry.value ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                              </div>
                            ))}
                          </div>
                        );
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="netWorth"
                      name="Net Worth"
                      stroke="#2563eb"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="investmentsValue"
                      name="Investments"
                      stroke="#16a34a"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="accountsValue"
                      name="Accounts"
                      stroke="#9333ea"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Portfolio Banner */}
          {selectedPortfolio && (
            <div className="mb-6 p-4 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <LinkIcon className="h-5 w-5 text-primary" />
                <div>
                  <Link href={`/holdings/${selectedPortfolio._id}`} className="font-semibold hover:underline">
                    {selectedPortfolio.name}
                  </Link>
                  <div className="text-sm text-muted-foreground">
                    {filteredAccounts.length} account{filteredAccounts.length !== 1 ? "s" : ""} • £{filteredTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })} total
                  </div>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setFilterPortfolio("all")}>
                View All
              </Button>
            </div>
          )}

          {/* New Account Form Modal */}
          {showNewAccountForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <Card className="w-full max-w-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                  <h2 className="text-xl font-semibold">Add New Account</h2>
                  <button onClick={resetForm} className="text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Account Name</label>
                    <Input
                      placeholder="e.g., NatWest Current Account"
                      value={newAccountName}
                      onChange={(e) => setNewAccountName(e.target.value)}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Account Type</label>
                    <Select value={newAccountType} onValueChange={(v: AccountType) => setNewAccountType(v)}>
                      <SelectTrigger className="mt-2">
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
                    <label className="text-sm font-medium">Purpose Tag (optional)</label>
                    <Input
                      placeholder="e.g., Emergency Fund, House Fund"
                      value={newAccountTag}
                      onChange={(e) => setNewAccountTag(e.target.value)}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Current Value (£)</label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="1000.00"
                      value={newAccountValue}
                      onChange={(e) => setNewAccountValue(e.target.value)}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Link to Portfolio (optional)</label>
                    <Select value={newAccountPortfolioId || "none"} onValueChange={(v) => setNewAccountPortfolioId(v === "none" ? "" : v)}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select a portfolio" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {portfolios.map(p => (
                          <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Link to a portfolio to easily import holdings
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Notes (optional)</label>
                    <Input
                      placeholder="Any additional notes"
                      value={newAccountNotes}
                      onChange={(e) => setNewAccountNotes(e.target.value)}
                      className="mt-2"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={resetForm}>Cancel</Button>
                    <Button onClick={addAccount} disabled={isSaving || !newAccountName.trim() || !newAccountValue}>
                      {isSaving ? "Adding..." : "Add Account"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
