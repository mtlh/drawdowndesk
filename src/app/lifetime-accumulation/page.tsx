"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
} from "@/components/ui/chart";
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2, Plus, TrendingUp, CalendarDays, PiggyBank, Target, Calculator, Save, Edit2, X, Pencil, Check } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useCurrentUser } from "@/hooks/useCurrentUser";

// Type for lifetime accumulation records
type AccumulationRecord = {
  _id: Id<"lifetimeAccumulations">
  _creationTime: number
  userId: string
  taxYear: number
  userAge: number
  totalValue: number
  breakdown?: string
  notes?: string
  lastUpdated?: string
}

// Account breakdown type
type AccountBreakdown = {
  id: string;
  name: string;
  value: number;
};

// Monthly contribution type
type MonthlyContribution = {
  accountName: string;
  monthlyAmount: number;
};

export default function LifetimeAccumulation() {
  const user = useCurrentUser()

  // User settings for default assumptions
  const userSettings = useQuery(
    api.tax.userSettings.getUserSettings,
    user ? { userId: user._id as Id<"users"> } : "skip"
  )

  // Get lifetime API functions
  const lifetimeApi = api.lifetime.lifetimeAccumulations;

  // Fetch data from Convex
  const accumulations = useQuery(lifetimeApi.getAccumulations) as AccumulationRecord[] | null | undefined;
  const latestAccumulation = useQuery(lifetimeApi.getLatestAccumulation) as AccumulationRecord | null | undefined;
  const continuousContributionsData = useQuery(lifetimeApi.getContinuousContributions);

  // Mutations
  const createAccumulation = useMutation(lifetimeApi.createAccumulation);
  const updateAccumulation = useMutation(lifetimeApi.updateAccumulation);
  const deleteAccumulation = useMutation(lifetimeApi.deleteAccumulation);
  const saveContinuousContributions = useMutation(lifetimeApi.saveContinuousContributions);

  // Local state for form
  const [editingId, setEditingId] = useState<Id<"lifetimeAccumulations"> | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [showAllRecords, setShowAllRecords] = useState(false);
  const [formData, setFormData] = useState({
    taxYear: new Date().getFullYear(),
    userAge: 30,
    totalValue: 0,
    accounts: [] as AccountBreakdown[],
    notes: "",
  });

  // Projection settings - use latest record's age as default
  const [currentAge, setCurrentAge] = useState(30);
  const [retirementAge, setRetirementAge] = useState(65);
  const [annualReturn, setAnnualReturn] = useState(5);
  const [inflation, setInflation] = useState(2);

  // Continuous contributions state
  const [contributions, setContributions] = useState<MonthlyContribution[]>([]);
  const [isEditingContributions, setIsEditingContributions] = useState(false);

  // Set default age from latest accumulation and sync with user settings
  useEffect(() => {
    if (latestAccumulation) {
      setCurrentAge(latestAccumulation.userAge);
    }
    if (userSettings) {
      setAnnualReturn(userSettings.defaultGrowthRate ?? 5)
      setInflation(userSettings.defaultInflationRate ?? 2)
    }
  }, [latestAccumulation, userSettings]);

  // Initialize contributions from database when available
  useEffect(() => {
    if (continuousContributionsData?.contributions) {
      try {
        const parsed = JSON.parse(continuousContributionsData.contributions);
        const loaded: MonthlyContribution[] = Object.entries(parsed).map(([accountName, monthlyAmount]) => ({
          accountName,
          monthlyAmount: monthlyAmount as number,
        }));
        setContributions(loaded);
      } catch (error) {
        console.warn("Failed to parse continuous contributions JSON:", error);
      }
    }
  }, [continuousContributionsData]);

  // Parse breakdown JSON
  const parseBreakdown = (breakdown?: string): Record<string, number> => {
    if (!breakdown) return {};
    try {
      return JSON.parse(breakdown);
    } catch (error) {
      console.warn("Failed to parse breakdown JSON:", error);
      return {};
    }
  };

  // Convert accounts array to JSON string for storage
  const accountsToJson = (accounts: AccountBreakdown[]): string => {
    const obj: Record<string, number> = {};
    accounts.forEach(acc => {
      if (acc.name.trim()) {
        obj[acc.name.trim()] = acc.value;
      }
    });
    return JSON.stringify(obj);
  };

  // Convert JSON string to accounts array for editing
  const jsonToAccounts = (json?: string): AccountBreakdown[] => {
    const parsed = parseBreakdown(json);
    return Object.entries(parsed).map(([name, value], index) => ({
      id: `acc-${index}-${Date.now()}`,
      name,
      value,
    }));
  };

  // Calculate total from accounts
  const calculateTotalFromAccounts = (accounts: AccountBreakdown[]): number => {
    return accounts.reduce((sum, acc) => sum + (acc.value || 0), 0);
  };

  // Get current total from latest record
  const currentTotal = accumulations && accumulations.length > 0
    ? accumulations[accumulations.length - 1].totalValue
    : 0;

  // Get unique account names from all records for the chart
  const allAccountNames = useMemo(() => {
    if (!accumulations || accumulations.length === 0) return [];
    const names = new Set<string>();
    accumulations.forEach(record => {
      const breakdown = parseBreakdown(record.breakdown);
      Object.keys(breakdown).forEach(name => names.add(name));
    });
    return Array.from(names).sort();
  }, [accumulations]);

  // Derive contributions from allAccountNames when state is empty
  const displayContributions = contributions.length > 0
    ? contributions
    : allAccountNames.map(name => ({ accountName: name, monthlyAmount: 0 }));

  // Handle adding new record
  const handleAddNew = () => {
    setIsAddingNew(true);
    setEditingId(null);
    // Default to next tax year after latest
    const nextYear = accumulations && accumulations.length > 0
      ? accumulations[accumulations.length - 1].taxYear + 1
      : new Date().getFullYear();
    setFormData({
      taxYear: nextYear,
      userAge: currentAge,
      totalValue: 0,
      accounts: [{ id: `acc-${Date.now()}`, name: "", value: 0 }],
      notes: "",
    });
  };

  // Add account to form
  const addAccountToForm = () => {
    setFormData({
      ...formData,
      accounts: [...formData.accounts, { id: `acc-${Date.now()}`, name: "", value: 0 }],
    });
  };

  // Remove account from form
  const removeAccountFromForm = (id: string) => {
    setFormData({
      ...formData,
      accounts: formData.accounts.filter(acc => acc.id !== id),
    });
  };

  // Update account in form
  const updateAccountInForm = (id: string, field: "name" | "value", value: string | number) => {
    setFormData({
      ...formData,
      accounts: formData.accounts.map(acc =>
        acc.id === id ? { ...acc, [field]: field === "value" ? (typeof value === "number" ? value : parseFloat(value as string) || 0) : value } : acc
      ),
    });
  };

  // Handle save (create)
  const handleSaveNew = async () => {
    const breakdownJson = accountsToJson(formData.accounts);
    try {
      await createAccumulation({
        taxYear: formData.taxYear,
        userAge: formData.userAge,
        totalValue: formData.totalValue || calculateTotalFromAccounts(formData.accounts),
        breakdown: breakdownJson || undefined,
        notes: formData.notes || undefined,
      });
      setIsAddingNew(false);
    } catch (error) {
      console.error("Error creating accumulation:", error);
    }
  };

  // Handle edit
  const handleEdit = (record: AccumulationRecord) => {
    setEditingId(record._id);
    setIsAddingNew(false);
    setFormData({
      taxYear: record.taxYear,
      userAge: record.userAge,
      totalValue: record.totalValue,
      accounts: jsonToAccounts(record.breakdown),
      notes: record.notes || "",
    });
  };

  // Handle save (update)
  const handleSaveEdit = async () => {
    if (!editingId) return;
    const breakdownJson = accountsToJson(formData.accounts);
    try {
      await updateAccumulation({
        id: editingId,
        taxYear: formData.taxYear,
        userAge: formData.userAge,
        totalValue: formData.totalValue || calculateTotalFromAccounts(formData.accounts),
        breakdown: breakdownJson || undefined,
        notes: formData.notes || undefined,
      });
      setEditingId(null);
    } catch (error) {
      console.error("Error updating accumulation:", error);
    }
  };

  // Handle delete
  const handleDelete = async (id: Id<"lifetimeAccumulations">) => {
    try {
      await deleteAccumulation({ id });
      if (editingId === id) {
        setEditingId(null);
      }
    } catch (error) {
      console.error("Error deleting accumulation:", error);
    }
  };

  // Cancel edit/add
  const handleCancel = () => {
    setIsAddingNew(false);
    setEditingId(null);
  };

  // Calculate projections with per-account breakdown
  const projectionData = useMemo(() => {
    if (!accumulations || accumulations.length === 0) {
      return [];
    }

    const data: Array<{
      age: number;
      taxYear: number;
      total: number;
      type: "historical" | "projected";
      [key: string]: number | string;
    }> = [];

    const nominalReturn = annualReturn / 100;

    // Get initial account values from the first record
    const firstRecord = accumulations[0];
    const firstBreakdown = parseBreakdown(firstRecord.breakdown);

    // Initialize running values for each account
    const accountValues: Record<string, number> = {};
    allAccountNames.forEach(name => {
      accountValues[name] = firstBreakdown[name] || 0;
    });

    // Add historical data and track projections
    for (let i = 0; i < accumulations.length; i++) {
      const record = accumulations[i];
      const breakdown = parseBreakdown(record.breakdown);

      // Update account values from this record
      allAccountNames.forEach(name => {
        accountValues[name] = breakdown[name] || accountValues[name];
      });

      const entry: typeof data[0] = {
        age: record.userAge,
        taxYear: record.taxYear,
        total: record.totalValue,
        type: "historical",
      };
      allAccountNames.forEach(name => {
        entry[name] = accountValues[name];
      });
      data.push(entry);
    }

    // Get the last historical record
    const lastRecord = accumulations[accumulations.length - 1];
    const lastBreakdown = parseBreakdown(lastRecord.breakdown);

    // Reset account values to last record
    allAccountNames.forEach(name => {
      accountValues[name] = lastBreakdown[name] || 0;
    });

    const lastAge = lastRecord.userAge;
    const lastTaxYear = lastRecord.taxYear;

    // If current age is set higher than last record age, project from there
    const startProjectionAge = Math.max(currentAge, lastAge + 1);

    // Create contributions lookup map
    const contributionsMap: Record<string, number> = {};
    contributions.forEach(c => {
      contributionsMap[c.accountName] = c.monthlyAmount;
    });

    // Project forward from last record
    for (let age = lastAge + 1; age <= retirementAge; age++) {
      // Grow each account value and add annual contributions
      allAccountNames.forEach(name => {
        const monthlyContribution = contributionsMap[name] || 0;
        const annualContribution = monthlyContribution * 12;
        // Apply growth then add annual contribution
        accountValues[name] = accountValues[name] * (1 + nominalReturn) + annualContribution;
      });

      const taxYear = lastTaxYear + (age - lastAge);

      const entry: typeof data[0] = {
        age,
        taxYear,
        total: Math.round(Object.values(accountValues).reduce((a, b) => a + b, 0)),
        type: age >= startProjectionAge ? "projected" : "historical",
      };
      allAccountNames.forEach(name => {
        entry[name] = Math.round(accountValues[name]);
      });
      data.push(entry);
    }

    return data;
  }, [accumulations, currentAge, retirementAge, annualReturn, allAccountNames, contributions]);

  // Calculate retirement income estimates using TOTAL values
  const retirementEstimates = useMemo(() => {
    if (projectionData.length === 0) return null;

    const retirementEntry = projectionData.find(p => p.age === retirementAge) ||
      projectionData[projectionData.length - 1];
    const portfolio = retirementEntry?.total || 0;

    // Calculate inflation-adjusted value (in today's pounds)
    const yearsToRetirement = retirementAge - currentAge;
    const inflationAdjusted = yearsToRetirement > 0 && inflation > 0
      ? portfolio / Math.pow(1 + inflation / 100, yearsToRetirement)
      : portfolio;

    // 4% rule: annual income = portfolio × 0.04
    const fourPercentAnnual = portfolio * 0.04;
    const fourPercentAnnualInflationAdjusted = inflationAdjusted * 0.04;

    // 375 rule (monthly): monthly income = portfolio ÷ 375
    const rule375Monthly = portfolio / 375;
    // Yearly equivalent: (portfolio ÷ 375) × 12
    const rule375Annual = rule375Monthly * 12;
    const rule375AnnualInflationAdjusted = (inflationAdjusted / 375) * 12;

    // Years of drawdown (assuming 4% withdrawal)
    const yearsOfDrawdown = 25;

    return {
      portfolio,
      inflationAdjusted,
      fourPercentAnnual,
      fourPercentAnnualInflationAdjusted,
      rule375Monthly,
      rule375Annual,
      rule375AnnualInflationAdjusted,
      yearsOfDrawdown,
    };
  }, [projectionData, retirementAge, currentAge, inflation]);

  // Chart config with accounts and total
  const chartConfig = useMemo(() => {
    const config: ChartConfig = {
      total: {
        label: "Total",
        color: "#8b5cf6",
      },
    };
    allAccountNames.forEach((name, index) => {
      const colors = ["#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#ec4899", "#8b5cf6"];
      config[name] = {
        label: name,
        color: colors[index % colors.length],
      };
    });
    return config;
  }, [allAccountNames]);

  // Account colors for chart
  const accountColors = ["#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#ec4899", "#8b5cf6"];

  return (
    <div className="flex min-h-screen bg-background">
      <main className="flex-1 overflow-y-auto overflow-x-hidden bg-background pr-4">
        <div className="p-4 lg:p-8 space-y-6">
          {/* Header Section */}
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-600 to-violet-700 flex items-center justify-center shadow-lg shadow-violet-600/20">
                <Target className="w-7 h-7 text-white" />
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Coast FI</div>
                <div className="text-4xl font-bold tracking-tight">
                  £{currentTotal.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <CalendarDays className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {accumulations && accumulations.length > 0
                      ? `${accumulations[0].taxYear} - ${accumulations[accumulations.length - 1].taxYear}`
                      : "No data"}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Stats Grid */}
            {retirementEstimates && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 flex-1 lg:max-w-3xl lg:ml-auto">
                {/* Total Projected */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border border-blue-200/50 dark:border-blue-800/50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <PiggyBank className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Total at {retirementAge}</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    £{retirementEstimates.portfolio.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </div>
                </div>
                {/* Inflation Adjusted */}
                <div className="bg-gradient-to-br from-violet-50 to-violet-100/50 dark:from-violet-950/30 dark:to-violet-900/20 border border-violet-200/50 dark:border-violet-800/50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Target className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                    <span className="text-xs font-medium text-violet-600 dark:text-violet-400">Inflation Adjusted</span>
                  </div>
                  <div className="text-2xl font-bold text-violet-600 dark:text-violet-400">
                    £{retirementEstimates.inflationAdjusted.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    @ {inflation}% inflation
                  </div>
                </div>
                {/* 4% Rule */}
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 border border-emerald-200/50 dark:border-emerald-800/50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">4% Rule</span>
                  </div>
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    £{retirementEstimates.fourPercentAnnualInflationAdjusted.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/yr
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    £{retirementEstimates.fourPercentAnnual.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/yr @ {inflation}% inflation
                  </div>
                </div>
                {/* 375 Rule */}
                <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20 border border-amber-200/50 dark:border-amber-800/50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Calculator className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-xs font-medium text-amber-600 dark:text-amber-400">375 Rule</span>
                  </div>
                  <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                    £{retirementEstimates.rule375AnnualInflationAdjusted.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/yr
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    £{retirementEstimates.rule375Annual.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/yr @ {inflation}% inflation
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Data Entry Section */}
          <Card className="overflow-hidden">
            <div className="px-6 py-4 border-b bg-muted/20 flex items-center justify-between">
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  <PiggyBank className="w-4 h-4 text-muted-foreground" />
                  Historical Records
                  {accumulations && accumulations.length > 3 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAllRecords(!showAllRecords)}
                      className="ml-2 h-6 text-xs"
                    >
                      {showAllRecords ? "Show less" : `Show all (${accumulations.length})`}
                    </Button>
                  )}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Add your account values by tax year
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={handleAddNew} className="gap-1.5" disabled={isAddingNew}>
                <Plus className="w-4 h-4" />
                Add Year
              </Button>
            </div>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-muted/30">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tax Year</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Age</th>
                      <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total (£)</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Accounts</th>
                      <th className="px-6 py-3 w-24"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {/* Add new row */}
                    {isAddingNew && (
                      <tr className="bg-muted/20">
                        <td className="px-6 py-4 align-top">
                          <Input
                            type="number"
                            className="h-9 w-24"
                            value={formData.taxYear}
                            onChange={(e) => setFormData({ ...formData, taxYear: parseInt(e.target.value) || 2024 })}
                          />
                        </td>
                        <td className="px-6 py-4 align-top">
                          <Input
                            type="number"
                            className="h-9 w-20"
                            value={formData.userAge}
                            onChange={(e) => setFormData({ ...formData, userAge: parseInt(e.target.value) || 30 })}
                          />
                        </td>
                        <td className="px-6 py-4 align-top">
                          <Input
                            type="number"
                            className="h-9 w-full text-right"
                            placeholder="Auto-calculated"
                            value={formData.totalValue || ""}
                            onChange={(e) => setFormData({ ...formData, totalValue: parseFloat(e.target.value) || 0 })}
                          />
                          <div className="text-xs text-muted-foreground mt-1">
                            Sum: £{calculateTotalFromAccounts(formData.accounts).toLocaleString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 align-top">
                          <div className="space-y-2">
                            {formData.accounts.map((account) => (
                              <div key={account.id} className="flex items-center gap-2">
                                <Input
                                  placeholder="Account name"
                                  className="h-8 w-28 text-sm"
                                  value={account.name}
                                  onChange={(e) => updateAccountInForm(account.id, "name", e.target.value)}
                                />
                                <Input
                                  type="number"
                                  placeholder="£"
                                  className="h-8 w-24 text-sm text-right"
                                  value={account.value || ""}
                                  onChange={(e) => updateAccountInForm(account.id, "value", e.target.value)}
                                />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                                  onClick={() => removeAccountFromForm(account.id)}
                                >
                                  <X className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            ))}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={addAccountToForm}
                              className="h-7 gap-1"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Add Account
                            </Button>
                          </div>
                        </td>
                        <td className="px-6 py-4 align-top">
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" onClick={handleSaveNew} className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30" aria-label="Save">
                              <Save className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={handleCancel} className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive" aria-label="Cancel">
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )}

                    {/* Existing records - show latest 3 unless expanded */}
                    {accumulations && (showAllRecords ? accumulations : accumulations.slice(-3)).map((record: AccumulationRecord) => (
                      <tr key={record._id} className="hover:bg-muted/30 transition-colors">
                        {editingId === record._id ? (
                          <>
                            <td className="px-6 py-4 align-top">
                              <Input
                                type="number"
                                className="h-9 w-24"
                                value={formData.taxYear}
                                onChange={(e) => setFormData({ ...formData, taxYear: parseInt(e.target.value) || 2024 })}
                              />
                            </td>
                            <td className="px-6 py-4 align-top">
                              <Input
                                type="number"
                                className="h-9 w-20"
                                value={formData.userAge}
                                onChange={(e) => setFormData({ ...formData, userAge: parseInt(e.target.value) || 30 })}
                              />
                            </td>
                            <td className="px-6 py-4 align-top">
                              <Input
                                type="number"
                                className="h-9 w-full text-right"
                                value={formData.totalValue}
                                onChange={(e) => setFormData({ ...formData, totalValue: parseFloat(e.target.value) || 0 })}
                              />
                              <div className="text-xs text-muted-foreground mt-1">
                                Sum: £{calculateTotalFromAccounts(formData.accounts).toLocaleString()}
                              </div>
                            </td>
                            <td className="px-6 py-4 align-top">
                              <div className="space-y-2">
                                {formData.accounts.map((account) => (
                                  <div key={account.id} className="flex items-center gap-2">
                                    <Input
                                      placeholder="Account name"
                                      className="h-8 w-28 text-sm"
                                      value={account.name}
                                      onChange={(e) => updateAccountInForm(account.id, "name", e.target.value)}
                                    />
                                    <Input
                                      type="number"
                                      placeholder="£"
                                      className="h-8 w-24 text-sm text-right"
                                      value={account.value || ""}
                                      onChange={(e) => updateAccountInForm(account.id, "value", e.target.value)}
                                    />
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                                      onClick={() => removeAccountFromForm(account.id)}
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                ))}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={addAccountToForm}
                                  className="h-7 gap-1"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  Add Account
                                </Button>
                              </div>
                            </td>
                            <td className="px-6 py-4 align-top">
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" onClick={handleSaveEdit} className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30" aria-label="Save">
                                  <Save className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={handleCancel} className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive" aria-label="Cancel">
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-6 py-4 font-medium">{record.taxYear}/{record.taxYear.toString().slice(-2)}</td>
                            <td className="px-6 py-4">{record.userAge}</td>
                            <td className="px-6 py-4 text-right font-semibold">
                              £{record.totalValue.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-wrap gap-1">
                                {Object.entries(parseBreakdown(record.breakdown)).map(([key, value]) => (
                                  <span key={key} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-muted">
                                    {key}: £{value.toLocaleString()}
                                  </span>
                                ))}
                                {record.breakdown === undefined && <span className="text-muted-foreground text-sm">-</span>}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center gap-1 justify-end">
                                <Button variant="ghost" size="icon" onClick={() => handleEdit(record)} className="h-8 w-8" aria-label="Edit">
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(record._id)} className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive" aria-label="Delete">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}

                    {/* Empty state */}
                    {accumulations && accumulations.length === 0 && !isAddingNew && (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                          No historical records yet. Click &quot;Add Year&quot; to get started.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Projection Settings and Continuous Contributions side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Projection Settings */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calculator className="w-5 h-5 text-violet-600" />
                      Projection Settings
                    </CardTitle>
                    <CardDescription>Configure your retirement projection assumptions</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Age inputs */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="current-age" className="text-sm font-medium">Current Age</label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="current-age"
                          type="number"
                          className="h-10"
                          value={currentAge}
                          onChange={(e) => setCurrentAge(parseInt(e.target.value) || 25)}
                        />
                        <span className="text-muted-foreground">years</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="retirement-age" className="text-sm font-medium">Retirement Age</label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="retirement-age"
                          type="number"
                          className="h-10"
                          value={retirementAge}
                          onChange={(e) => setRetirementAge(parseInt(e.target.value) || 65)}
                          aria-label="Retirement age"
                        />
                        <span className="text-muted-foreground">years</span>
                      </div>
                    </div>
                  </div>
                  {/* Growth and Inflation rates */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="annual-return" className="text-sm font-medium">Annual Return</label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="annual-return"
                          type="number"
                          className="h-10"
                          value={annualReturn}
                          onChange={(e) => setAnnualReturn(parseFloat(e.target.value) || 0)}
                        />
                        <span className="text-muted-foreground">%</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="inflation" className="text-sm font-medium">Inflation</label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="inflation"
                          type="number"
                          className="h-10"
                          value={inflation}
                          onChange={(e) => setInflation(parseFloat(e.target.value) || 0)}
                        />
                        <span className="text-muted-foreground">%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Continuous Contributions */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <PiggyBank className="w-5 h-5 text-emerald-600" />
                    Continuous Contributions
                  </CardTitle>
                  <CardDescription>Add monthly contributions to your accounts for projections</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    if (!isEditingContributions) {
                      // Initialize contributions when entering edit mode
                      const initialContributions: MonthlyContribution[] = allAccountNames.map(name => {
                        const existing = contributions.find(c => c.accountName === name);
                        return {
                          accountName: name,
                          monthlyAmount: existing?.monthlyAmount || 0,
                        };
                      });
                      setContributions(initialContributions);
                      setIsEditingContributions(true);
                    } else {
                      // Save contributions to database when clicking Done
                      const contributionsObj: Record<string, number> = {};
                      contributions.forEach(c => {
                        if (c.accountName.trim() && c.monthlyAmount > 0) {
                          contributionsObj[c.accountName.trim()] = c.monthlyAmount;
                        }
                      });
                      await saveContinuousContributions({ contributions: JSON.stringify(contributionsObj) });
                      setIsEditingContributions(false);
                    }
                  }}
                  className="gap-1.5"
                >
                  {isEditingContributions ? (
                    <>
                      <Check className="w-4 h-4" />
                      Done
                    </>
                  ) : (
                    <>
                      <Pencil className="w-4 h-4" />
                      Edit
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {allAccountNames.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Add historical records with account breakdowns to configure contributions.
                </p>
              ) : isEditingContributions ? (
                <div className="space-y-3">
                  {displayContributions.map((contribution, index) => (
                    <div key={contribution.accountName} className="flex items-center gap-4">
                      <label className="text-sm font-medium w-32">{contribution.accountName}</label>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">£</span>
                        <Input
                          type="number"
                          className="w-28 h-9"
                          value={contribution.monthlyAmount || ""}
                          onChange={(e) => {
                            const newAmount = parseFloat(e.target.value) || 0;
                            setContributions(prev => prev.map((c, i) =>
                              i === index ? { ...c, monthlyAmount: newAmount } : c
                            ));
                          }}
                          placeholder="0"
                        />
                        <span className="text-sm text-muted-foreground">/month</span>
                      </div>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground mt-2">
                    Contributions are added annually (monthly × 12) in projections
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {displayContributions.length > 0 && displayContributions.some(c => c.monthlyAmount > 0) ? (
                    displayContributions.filter(c => c.monthlyAmount > 0).map(c => (
                      <div key={c.accountName} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{c.accountName}</span>
                        <span className="font-medium">£{c.monthlyAmount.toLocaleString()}/month</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No continuous contributions configured. Click Edit to add monthly contributions per account.
                    </p>
                  )}
                  {displayContributions.length > 0 && displayContributions.some(c => c.monthlyAmount > 0) && (
                    <div className="pt-2 mt-2 border-t">
                      <div className="flex justify-between text-sm font-medium">
                        <span>Total monthly</span>
                        <span>£{displayContributions.reduce((sum, c) => sum + c.monthlyAmount, 0).toLocaleString()}/month</span>
                      </div>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Total annual</span>
                        <span>£{(displayContributions.reduce((sum, c) => sum + c.monthlyAmount, 0) * 12).toLocaleString()}/year</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          </div>

          {/* Projection Chart */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-violet-600" />
                    Lifetime Projection
                  </CardTitle>
                  <CardDescription>Historical data + projected growth to retirement</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {projectionData.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-[400px] w-full">
                  <LineChart
                    data={projectionData}
                    margin={{ top: 10, left: 10, right: 10 }}
                  >
                    <CartesianGrid vertical={false} className="stroke-muted" />
                    <XAxis
                      dataKey="age"
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                      tickMargin={8}
                      tickFormatter={(v) => `Age ${v}`}
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
                      content={({ active, payload, label }) => {
                        if (!active || !payload || !payload.length) return null;
                        return (
                          <div className="bg-background border border-border rounded-lg shadow-lg p-3 min-w-[160px]">
                            <div className="font-semibold border-b pb-2 mb-2">Age {label}</div>
                            <div className="space-y-1.5">
                              {payload.map((entry, index) => (
                                <div key={index} className="flex items-center justify-between gap-4">
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="w-3 h-3 rounded-full"
                                      style={{ backgroundColor: entry.color }}
                                    />
                                    <span className="text-sm">{entry.name === 'total' ? 'Total' : entry.name}</span>
                                  </div>
                                  <span className="text-sm font-medium">
                                    £{(entry.value as number).toLocaleString()}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }}
                    />
                    {/* Account lines */}
                    {allAccountNames.map((name, index) => (
                      <Line
                        key={name}
                        type="monotone"
                        dataKey={name}
                        stroke={accountColors[index % accountColors.length]}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                    ))}
                    {/* Total line on top */}
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke="#8b5cf6"
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ChartContainer>
              ) : (
                <div className="h-[320px] flex items-center justify-center text-muted-foreground">
                  Add historical records to see projection chart
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
