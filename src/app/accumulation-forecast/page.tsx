"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, TrendingUp, CalendarDays, PiggyBank, Target, Calculator } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useCurrentUser } from "@/hooks/useCurrentUser";

interface Contribution {
  id: string;
  age: number;
  amount: number;
}

interface AccountForecast {
  id: string;
  accountType: string;
  startingBalance: number;
  yearlyContribution: number;
  contributions: Contribution[];
}

export default function AccumulationForecast() {
  const user = useCurrentUser()

  // User settings for default assumptions
  const userSettings = useQuery(
    api.tax.userSettings.getUserSettings,
    user ? { userId: user._id as Id<"users"> } : "skip"
  )

  const [currentAge, setCurrentAge] = useState(25);
  const [retirementAge, setRetirementAge] = useState(65);
  const [annualReturn, setAnnualReturn] = useState(5);
  const [inflation, setInflation] = useState(2);
  const [contributionMode, setContributionMode] = useState<"yearly" | "manual">("yearly");
  const [accounts, setAccounts] = useState<AccountForecast[]>([
    { id: "1", accountType: "GIA", startingBalance: 0, yearlyContribution: 0, contributions: [] }
  ]);

  // Sync with user settings when loaded
  useEffect(() => {
    if (userSettings) {
      setAnnualReturn(userSettings.defaultGrowthRate ?? 5)
      setInflation(userSettings.defaultInflationRate ?? 2)
    }
  }, [userSettings])

  const addAccount = () => {
    const types = ["GIA", "ISA", "Pension"];
    const usedTypes = accounts.map(a => a.accountType);
    const nextType = types.find(t => !usedTypes.includes(t)) || "GIA";
    setAccounts([...accounts, {
      id: Math.random().toString(36).substr(2, 9),
      accountType: nextType,
      startingBalance: 0,
      yearlyContribution: 0,
      contributions: []
    }]);
  };

  const removeAccount = (index: number) => {
    setAccounts(accounts.filter((_, i) => i !== index));
  };

  const updateAccountField = (index: number, field: "accountType" | "startingBalance" | "yearlyContribution", value: string | number) => {
    const updated = [...accounts];
    if (field === "accountType") {
      updated[index].accountType = value as string;
    } else if (field === "startingBalance") {
      updated[index].startingBalance = typeof value === "number" ? value : parseFloat(value as string) || 0;
    } else if (field === "yearlyContribution") {
      updated[index].yearlyContribution = typeof value === "number" ? value : parseFloat(value as string) || 0;
    }
    setAccounts(updated);
  };

  const addContribution = (accountIndex: number) => {
    const updated = [...accounts];
    updated[accountIndex].contributions.push({
      id: Math.random().toString(36).substr(2, 9),
      age: currentAge + 1,
      amount: 1000
    });
    setAccounts(updated);
  };

  const updateContribution = (accountIndex: number, contribIndex: number, field: "age" | "amount", value: number) => {
    const updated = [...accounts];
    updated[accountIndex].contributions[contribIndex][field] = value;
    setAccounts(updated);
  };

  const removeContribution = (accountIndex: number, contribIndex: number) => {
    const updated = [...accounts];
    updated[accountIndex].contributions = updated[accountIndex].contributions.filter((_, i) => i !== contribIndex);
    setAccounts(updated);
  };

  const forecastData = useMemo(() => {
    const data = [];
    const realReturn = (1 + annualReturn / 100) / (1 + inflation / 100) - 1;

    let runningTotal = accounts.reduce((sum, acc) => sum + acc.startingBalance, 0);
    let runningContributions = accounts.reduce((sum, acc) => sum + acc.startingBalance, 0);

    data.push({
      age: currentAge,
      value: Math.round(runningTotal),
      contributions: Math.round(runningContributions),
      growth: 0
    });

    for (let age = currentAge + 1; age <= retirementAge; age++) {
      runningTotal = runningTotal * (1 + realReturn);

      for (const account of accounts) {
        const yearContribs = account.contributions.filter(c => c.age === age);
        for (const contrib of yearContribs) {
          runningContributions += contrib.amount;
          runningTotal += contrib.amount;
        }

        if (contributionMode === "yearly") {
          runningContributions += account.yearlyContribution;
          runningTotal += account.yearlyContribution;
        }
      }

      data.push({
        age,
        value: Math.round(runningTotal),
        contributions: Math.round(runningContributions),
        growth: Math.round(runningTotal - runningContributions)
      });
    }

    return data;
  }, [currentAge, retirementAge, annualReturn, inflation, contributionMode, accounts]);

  const finalValues = forecastData[forecastData.length - 1] || { value: 0, contributions: 0, growth: 0 };

  const accountTotals = useMemo(() => {
    return accounts.map(account => {
      const accountData = forecastData.map(d => {
        const yearlyRate = (1 + annualReturn / 100) / (1 + inflation / 100) - 1;
        let balance = account.startingBalance;
        let contribs = account.startingBalance;

        for (let age = currentAge + 1; age <= d.age; age++) {
          balance = balance * (1 + yearlyRate);
          const yearContribs = account.contributions.filter(c => c.age === age);
          for (const c of yearContribs) {
            contribs += c.amount;
            balance += c.amount;
          }
          if (contributionMode === "yearly") {
            contribs += account.yearlyContribution;
            balance += account.yearlyContribution;
          }
        }
        return { balance, contribs };
      });

      const final = accountData[accountData.length - 1] || { balance: 0, contribs: 0 };
      return {
        type: account.accountType,
        finalValue: final.balance,
        totalContributions: final.contribs,
        growth: final.balance - final.contribs
      };
    });
  }, [accounts, forecastData, annualReturn, inflation, contributionMode, currentAge]);

  const chartConfig = {
    value: {
      label: "Total Value",
      color: "var(--chart-1)",
    },
  } satisfies ChartConfig;

  return (
    <div className="flex min-h-screen bg-background">
      <main className="flex-1 overflow-y-auto overflow-x-hidden bg-background pr-4">
        <div className="p-4 lg:p-8 space-y-6">
          {/* Header Section */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Forecast Display */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-600/20">
                <Target className="w-7 h-7 text-white" />
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Forecasted Net Worth</div>
                <div className="text-4xl font-bold tracking-tight">
                  £{finalValues.value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <CalendarDays className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Age {currentAge} → {retirementAge}</span>
                </div>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-3 flex-1 lg:max-w-2xl">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border border-blue-200/50 dark:border-blue-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <PiggyBank className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Contributions</span>
                </div>
                <div className="text-2xl font-bold">£{finalValues.contributions.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
              </div>
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 border border-emerald-200/50 dark:border-emerald-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Investment Growth</span>
                </div>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">£{finalValues.growth.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20 border border-amber-200/50 dark:border-amber-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Calculator className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Real Return</span>
                </div>
                <div className="text-2xl font-bold">{((annualReturn - inflation)).toFixed(1)}%</div>
              </div>
            </div>
          </div>

          {/* Assumptions and Controls */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-blue-600" />
                    Forecast Assumptions
                  </CardTitle>
                  <CardDescription>Adjust your forecast parameters</CardDescription>
                </div>
                <div className="flex items-center gap-1 bg-muted/50 dark:bg-muted/30 p-1 rounded-lg">
                  <Button
                    size="sm"
                    variant={contributionMode === "yearly" ? "default" : "ghost"}
                    onClick={() => setContributionMode("yearly")}
                    className="h-8"
                  >
                    Yearly
                  </Button>
                  <Button
                    size="sm"
                    variant={contributionMode === "manual" ? "default" : "ghost"}
                    onClick={() => setContributionMode("manual")}
                    className="h-8"
                  >
                    Manual
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-end gap-4">
                <div className="flex items-center gap-2">
                  <label htmlFor="current-age" className="text-sm text-muted-foreground whitespace-nowrap">Current Age</label>
                  <Input
                    id="current-age"
                    type="number"
                    className="w-20 h-9"
                    value={currentAge}
                    onChange={(e) => setCurrentAge(parseInt(e.target.value) || 25)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">→</span>
                  <label htmlFor="retirement-age" className="text-sm text-muted-foreground whitespace-nowrap">Retirement Age</label>
                  <Input
                    id="retirement-age"
                    type="number"
                    className="w-20 h-9"
                    value={retirementAge}
                    onChange={(e) => setRetirementAge(parseInt(e.target.value) || 65)}
                    aria-label="Retirement age"
                  />
                </div>
                <div className="w-px h-8 bg-border" />
                <div className="flex items-center gap-2">
                  <label htmlFor="annual-return" className="text-sm text-muted-foreground whitespace-nowrap">Annual Return</label>
                  <Input
                    id="annual-return"
                    type="number"
                    className="w-20 h-9"
                    value={annualReturn}
                    onChange={(e) => setAnnualReturn(parseFloat(e.target.value) || 0)}
                  />
                  <span className="text-muted-foreground">%</span>
                </div>
                <div className="flex items-center gap-2">
                  <label htmlFor="inflation" className="text-sm text-muted-foreground whitespace-nowrap">Inflation</label>
                  <Input
                    id="inflation"
                    type="number"
                    className="w-20 h-9"
                    value={inflation}
                    onChange={(e) => setInflation(parseFloat(e.target.value) || 0)}
                  />
                  <span className="text-muted-foreground">%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Accounts Section */}
          <Card className="overflow-hidden">
            <div className="px-6 py-4 border-b bg-muted/20 flex items-center justify-between">
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  <PiggyBank className="w-4 h-4 text-muted-foreground" />
                  Accounts
                </h3>
                <p className="text-sm text-muted-foreground">
                  Configure your investment accounts
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={addAccount} className="gap-1.5">
                <Plus className="w-4 h-4" />
                Add Account
              </Button>
            </div>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-muted/30">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Account</th>
                      <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Starting Balance (£)</th>
                      {contributionMode === "yearly" && <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Yearly Contribution (£)</th>}
                      <th className="px-6 py-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {accounts.map((account, accountIndex) => (
                      <tr key={account.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4">
                          <Select value={account.accountType} onValueChange={(v) => updateAccountField(accountIndex, "accountType", v)}>
                            <SelectTrigger className="w-full h-9" aria-label="Select account type">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                <SelectItem value="GIA">GIA</SelectItem>
                                <SelectItem value="ISA">ISA</SelectItem>
                                <SelectItem value="Pension">Pension</SelectItem>
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-6 py-4">
                          <Input
                            type="number"
                            className="h-9 w-full text-right"
                            value={account.startingBalance}
                            onChange={(e) => updateAccountField(accountIndex, "startingBalance", e.target.value)}
                          />
                        </td>
                        {contributionMode === "yearly" && (
                          <td className="px-6 py-4">
                            <Input
                              type="number"
                              className="h-9 w-full text-right"
                              value={account.yearlyContribution}
                              onChange={(e) => updateAccountField(accountIndex, "yearlyContribution", e.target.value)}
                            />
                          </td>
                        )}
                        <td className="px-6 py-4 text-right">
                          {accounts.length > 1 && (
                            <Button variant="ghost" size="icon" onClick={() => removeAccount(accountIndex)} className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive" aria-label="Remove account">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Manual contributions */}
              {contributionMode === "manual" && (
                <div className="px-6 py-4 bg-muted/20 border-t">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm font-medium">One-off contributions</span>
                    <Button size="sm" variant="outline" onClick={() => addContribution(0)} className="h-7 gap-1">
                      <Plus className="w-3.5 h-3.5" />
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {accounts[0]?.contributions.map((contrib, contribIndex) => (
                      <div key={contrib.id} className="flex items-center gap-2 bg-background p-2 rounded-lg border shadow-sm">
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">Age</span>
                          <Input
                            type="number"
                            className="h-7 w-16 text-center text-sm"
                            value={contrib.age}
                            onChange={(e) => updateContribution(0, contribIndex, "age", parseInt(e.target.value) || 0)}
                          />
                        </div>
                        <span className="text-muted-foreground">:</span>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">£</span>
                          <Input
                            type="number"
                            className="h-7 w-24 text-sm"
                            value={contrib.amount}
                            onChange={(e) => updateContribution(0, contribIndex, "amount", parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => removeContribution(0, contribIndex)} className="h-7 w-7" aria-label="Remove contribution">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                    {accounts[0]?.contributions.length === 0 && (
                      <p className="text-sm text-muted-foreground">No one-off contributions added</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Account Breakdown Cards */}
          {accountTotals.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {accountTotals.map((account, index) => (
                <div key={index} className="p-5 border rounded-xl bg-gradient-to-br from-card to-muted/20">
                  <div className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${
                      account.type === 'GIA' ? 'bg-blue-500' :
                      account.type === 'ISA' ? 'bg-emerald-500' :
                      'bg-amber-500'
                    }`} />
                    {account.type}
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Final Value</span>
                      <span className="font-semibold">£{account.finalValue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Contributions</span>
                      <span className="font-medium">£{account.totalContributions.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Growth</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">+£{account.growth.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Forecast Chart */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                    Accumulation Forecast
                  </CardTitle>
                  <CardDescription>Projected growth over time</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[320px] w-full">
                <AreaChart
                  data={forecastData}
                  margin={{ top: 10, left: 10, right: 10 }}
                >
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} className="stroke-muted" />
                  <XAxis
                    dataKey="age"
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    tickMargin={8}
                    tickFormatter={(v) => v.toString()}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    tickFormatter={(value) => `£${(value / 1000).toFixed(0)}k`}
                    width={60}
                    tickLine={false}
                    axisLine={false}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent />}
                    formatter={(value: number) => [`£${value.toLocaleString()}`, "Value"]}
                    labelFormatter={(label) => `Age ${label}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fill="url(#colorValue)"
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
