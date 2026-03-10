"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartTooltip,
} from "@/components/ui/chart";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Line,
  LineChart,
} from "recharts";
import { TrendingUp, Calendar, PoundSterling, AlertCircle, Building2, Wallet, PiggyBank, Save, GitCompare } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { CreateTakeHome, TaxInfo } from "@/lib/createTakeHome";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

// Account types with different tax treatments
type AccountType = "pension" | "isa" | "gia";

interface Account {
  type: AccountType;
  value: number;
  name: string;
  icon: React.ReactNode;
  color: string;
  description: string;
}

interface CashflowYear {
  age: number;
  pensionPot: number;
  isaPot: number;
  giaPot: number;
  totalPot: number;
  pensionWithdrawal: number;
  isaWithdrawal: number;
  giaWithdrawal: number;
  totalWithdrawal: number;
  statePension: number;
  pensionTaxFree: number;
  pensionTaxed: number;
  grossIncome: number;
  incomeTax: number;
  nationalInsurance: number;
  takeHomePay: number;
}

interface SummaryMetrics {
  totalWithdrawals: number;
  totalTax: number;
  totalTakeHome: number;
  yearsUntilDepleted: number;
  finalTotalValue: number;
  pensionTotal: number;
  isaTotal: number;
  giaTotal: number;
}

// Custom hook for calculations with multiple accounts
const useCashflowCalculation = (
  accounts: Account[],
  annualGrowthRate: number,
  withdrawalRate: number,
  startAge: number,
  statePension: number,
  statePensionAge: number,
  taxInfo: TaxInfo
) => {
  return useMemo((): { chartData: CashflowYear[]; summary: SummaryMetrics } => {
    const endAge = 100;

    // Initialize pots
    let pensionPot = accounts.find(a => a.type === "pension")?.value || 0;
    let isaPot = accounts.find(a => a.type === "isa")?.value || 0;
    let giaPot = accounts.find(a => a.type === "gia")?.value || 0;

    const years: CashflowYear[] = [];
    let yearsUntilDepleted = endAge - startAge;
    let finalTotalValue = 0;

    for (let age = startAge; age <= endAge; age++) {
      // Apply growth to each pot
      const pensionGrowth = pensionPot * annualGrowthRate;
      const isaGrowth = isaPot * annualGrowthRate;
      const giaGrowth = giaPot * annualGrowthRate;

      pensionPot += pensionGrowth;
      isaPot += isaGrowth;
      giaPot += giaGrowth;

      // State pension
      const currentStatePension = age >= statePensionAge ? statePension : 0;

      // Calculate withdrawals from each pot (proportional to pot size)
      const totalPot = pensionPot + isaPot + giaPot;
      const withdrawal = totalPot > 0 ? Math.min(totalPot * withdrawalRate, totalPot) : 0;

      // Withdraw proportionally from each pot
      let pensionWithdrawal = 0;
      let isaWithdrawal = 0;
      let giaWithdrawal = 0;

      if (withdrawal > 0 && totalPot > 0) {
        const ratio = withdrawal / totalPot;
        pensionWithdrawal = pensionPot * ratio;
        isaWithdrawal = isaPot * ratio;
        giaWithdrawal = giaPot * ratio;
      }

      // Update pots after withdrawal
      pensionPot -= pensionWithdrawal;
      isaPot -= isaWithdrawal;
      giaPot -= giaWithdrawal;

      // Ensure no negative values
      pensionPot = Math.max(0, pensionPot);
      isaPot = Math.max(0, isaPot);
      giaPot = Math.max(0, giaPot);

      // Calculate tax for each account type
      // Pension: 25% tax-free, rest taxed as income
      const pensionTaxFree = pensionWithdrawal * 0.25;
      const pensionTaxed = pensionWithdrawal * 0.75;

      // ISA: completely tax-free
      const isaTaxFree = isaWithdrawal;

      // GIA: assume all is gain for simplicity (in reality only gains are taxed)
      // For simplicity, we'll treat GIA withdrawals as taxable
      const giaTaxable = giaWithdrawal;

      // Total taxable income
      const totalTaxableIncome = pensionTaxed + giaTaxable + currentStatePension;

      // Calculate tax using existing function
      const taxResult = CreateTakeHome(taxInfo, totalTaxableIncome);
      const hasError = 'error' in taxResult && taxResult.error;

      // Scale tax proportionally to each income source
      const incomeTax = hasError ? 0 : (taxResult as { incomeTax: number }).incomeTax;
      const nationalInsurance = hasError ? 0 : (taxResult as { nationalInsurance: number }).nationalInsurance;

      // Calculate tax on pension portion (proportional)
      let pensionIncomeTax = 0;
      let giaIncomeTax = 0;
      if (totalTaxableIncome > 0) {
        pensionIncomeTax = pensionTaxed > 0 ? (pensionTaxed / totalTaxableIncome) * incomeTax : 0;
        giaIncomeTax = giaTaxable > 0 ? (giaTaxable / totalTaxableIncome) * incomeTax : 0;
      }

      // Take home from each source
      const pensionTakeHome = pensionTaxFree + (pensionTaxed - pensionIncomeTax);
      const isaTakeHome = isaTaxFree;
      const giaTakeHome = giaTaxable - giaIncomeTax;
      const statePensionTakeHome = currentStatePension - (currentStatePension > 0 ? ((currentStatePension / totalTaxableIncome) * incomeTax || 0) : 0);

      const totalTakeHome = pensionTakeHome + isaTakeHome + giaTakeHome + statePensionTakeHome;

      // Track when all pots deplete
      const currentTotalPot = pensionPot + isaPot + giaPot;
      if (currentTotalPot <= 0 && yearsUntilDepleted === endAge - startAge) {
        yearsUntilDepleted = age - startAge;
      }

      finalTotalValue = currentTotalPot;

      years.push({
        age,
        pensionPot,
        isaPot,
        giaPot,
        totalPot: currentTotalPot,
        pensionWithdrawal,
        isaWithdrawal,
        giaWithdrawal,
        totalWithdrawal: pensionWithdrawal + isaWithdrawal + giaWithdrawal,
        statePension: currentStatePension,
        pensionTaxFree,
        pensionTaxed,
        grossIncome: pensionWithdrawal + isaWithdrawal + giaWithdrawal + currentStatePension,
        incomeTax: pensionIncomeTax + giaIncomeTax + ((currentStatePension / (totalTaxableIncome || 1)) * incomeTax || 0) + nationalInsurance,
        nationalInsurance,
        takeHomePay: totalTakeHome,
      });
    }

    const summary: SummaryMetrics = {
      totalWithdrawals: years.reduce((sum, y) => sum + y.totalWithdrawal, 0),
      totalTax: years.reduce((sum, y) => sum + y.incomeTax + y.nationalInsurance, 0),
      totalTakeHome: years.reduce((sum, y) => sum + y.takeHomePay, 0),
      yearsUntilDepleted: yearsUntilDepleted === endAge - startAge && finalTotalValue > 0
        ? endAge - startAge + 1
        : yearsUntilDepleted,
      finalTotalValue,
      pensionTotal: years.reduce((sum, y) => sum + y.pensionWithdrawal, 0),
      isaTotal: years.reduce((sum, y) => sum + y.isaWithdrawal, 0),
      giaTotal: years.reduce((sum, y) => sum + y.giaWithdrawal, 0),
    };

    return { chartData: years, summary };
  }, [accounts, annualGrowthRate, withdrawalRate, startAge, statePension, statePensionAge, taxInfo]);
};

// Type for current user query result
type CurrentUserResult = { _id: string } | null;

// Helper function to get current user - wraps useQuery to avoid deep type inference
function useCurrentUserQuery(): CurrentUserResult | undefined {
  return useQuery(api.currentUser.getCurrentUser.getCurrentUser);
}

// Helper function to get tax info - wraps useQuery to avoid deep type inference
function useTaxInfoQuery(userId: string | undefined): TaxInfo {
  return useQuery(api.tax.runTaxQuery.getTaxInfoForIncome, {
    taxYear: 2025,
    userId: userId as Id<"users"> | undefined
  }) as TaxInfo;
}

// Type for user settings
type UserSettings = {
  statePensionAmount: number;
  statePensionAge: number;
  defaultGrowthRate: number;
  defaultInflationRate: number;
};

// Helper function to get user settings - wraps useQuery
function useUserSettingsQuery(userId: string | undefined): UserSettings | undefined {
  return useQuery(
    api.tax.userSettings.getUserSettings,
    userId ? { userId: userId as Id<"users"> } : "skip"
  ) as UserSettings | undefined;
}

export default function RetirementCashflowCalculator() {
  const user = useCurrentUserQuery();

  // Tax data - passes userId for custom overrides
  const taxBandInformation = useTaxInfoQuery(user?._id);

  // User settings for state pension
  const userSettings = useUserSettingsQuery(user?._id);

  // Scenarios
  const createScenario = useMutation(api.scenarios.scenarioCrud.createScenario);

  // Scenario UI state
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [scenarioName, setScenarioName] = useState("");
  const [scenarioDescription, setScenarioDescription] = useState("");

  // Account values
  const [pensionValue, setPensionValue] = useState(500000);
  const [isaValue, setIsaValue] = useState(100000);
  const [giaValue, setGiaValue] = useState(100000);

  // Growth and withdrawal rates (same for all accounts)
  const [growthRate, setGrowthRate] = useState(5);
  const [withdrawalRate, setWithdrawalRate] = useState(3);

  // State pension - use user settings if available, otherwise use defaults
  const [statePension, setStatePension] = useState(11000);
  const [statePensionAge, setStatePensionAge] = useState(67);
  const [startAge, setStartAge] = useState(55);

  // Save current settings as a scenario
  const handleSaveScenario = async () => {
    if (!scenarioName.trim()) return;
    try {
      await createScenario({
        name: scenarioName.trim(),
        description: scenarioDescription.trim() || undefined,
        pensionValue,
        isaValue,
        giaValue,
        growthRate,
        withdrawalRate,
        startAge,
        statePension,
        statePensionAge,
      });
      setSaveDialogOpen(false);
      setScenarioName("");
      setScenarioDescription("");
    } catch (error) {
      console.error("Failed to save scenario:", error);
    }
  };

  // Sync values with user settings when they load
  useMemo(() => {
    if (userSettings) {
      setStatePension(userSettings.statePensionAmount);
      setStatePensionAge(userSettings.statePensionAge);
      setGrowthRate(userSettings.defaultGrowthRate ?? 5);
    }
  }, [userSettings]);

  // Build accounts array
  const accounts: Account[] = [
    {
      type: "pension",
      value: pensionValue,
      name: "Pension",
      icon: <Building2 className="h-4 w-4" />,
      color: "var(--chart-1)",
      description: "25% tax-free, rest taxed as income",
    },
    {
      type: "isa",
      value: isaValue,
      name: "ISA",
      icon: <PiggyBank className="h-4 w-4" />,
      color: "var(--chart-2)",
      description: "Completely tax-free",
    },
    {
      type: "gia",
      value: giaValue,
      name: "GIA",
      icon: <Wallet className="h-4 w-4" />,
      color: "var(--chart-4)",
      description: "Taxed on gains within income brackets",
    },
  ];

  const totalPortfolio = pensionValue + isaValue + giaValue;

  // Calculate data
  const { chartData, summary } = useCashflowCalculation(
    accounts,
    growthRate / 100,
    withdrawalRate / 100,
    startAge,
    statePension,
    statePensionAge,
    taxBandInformation
  );

  // Loading/error states
  if (!taxBandInformation || !userSettings) {
    return <LoadingSpinner fullScreen message="Loading tax information..." />;
  }

  if (taxBandInformation && 'error' in taxBandInformation && taxBandInformation.error) {
    return (
      <div className="flex min-h-screen bg-background items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Error Loading Tax Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{taxBandInformation.error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Chart configurations - using explicit colors for better distinction
  const incomeConfig = {
    takeHomePay: { label: "Pension Take Home", color: "#22c55e" },      // Green
    isaWithdrawal: { label: "ISA", color: "#3b82f6" },                   // Blue
    giaWithdrawal: { label: "GIA", color: "#f97316" },                   // Orange
    statePension: { label: "State Pension", color: "#8b5cf6" },           // Purple
    incomeTax: { label: "Tax (inc NI)", color: "#ef4444" },              // Red
  } satisfies ChartConfig;

  const potConfig = {
    pension: { label: "Pension", color: "#22c55e" },
    isa: { label: "ISA", color: "#3b82f6" },
    gia: { label: "GIA", color: "#f97316" },
  } satisfies ChartConfig;

  return (
    <div className="flex min-h-screen bg-background">
      <main className="flex-1 overflow-y-auto overflow-x-hidden bg-background pr-4">
        <div className="p-4 lg:p-8 space-y-6">
          {/* Header Section */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-600/20">
                <TrendingUp className="w-7 h-7 text-white" />
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Retirement Cashflow</div>
                <div className="text-4xl font-bold tracking-tight">
                  £{totalPortfolio.toLocaleString("en-US", { minimumFractionDigits: 0 })}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Starting at age {startAge}
                </div>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1 lg:max-w-3xl">
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 border border-emerald-200/50 dark:border-emerald-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <PoundSterling className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Total Take Home</span>
                </div>
                <div className="text-2xl font-bold">£{(summary.totalTakeHome / 1000).toFixed(0)}k</div>
              </div>
              <div className="bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/30 dark:to-red-900/20 border border-red-200/50 dark:border-red-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <PoundSterling className="w-4 h-4 text-red-600 dark:text-red-400" />
                  <span className="text-xs font-medium text-red-600 dark:text-red-400">Total Tax</span>
                </div>
                <div className="text-2xl font-bold">£{(summary.totalTax / 1000).toFixed(0)}k</div>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border border-blue-200/50 dark:border-blue-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Money Lasts</span>
                </div>
                <div className="text-2xl font-bold">
                  {summary.yearsUntilDepleted > 100 - startAge ? "Forever" : `${summary.yearsUntilDepleted} yrs`}
                </div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20 border border-purple-200/50 dark:border-purple-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-xs font-medium text-purple-600 dark:text-purple-400">At Age 100</span>
                </div>
                <div className="text-2xl font-bold">
                  {summary.finalTotalValue > 0 ? `£${(summary.finalTotalValue / 1000000).toFixed(1)}M` : "£0"}
                </div>
              </div>
            </div>
          </div>

          {/* Save Scenario Button */}
          <Card className="overflow-hidden border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Save this forecast as a scenario?</p>
                  <p className="text-sm text-muted-foreground">Save your current settings to compare different retirement strategies</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" asChild>
                    <a href="/what-if-scenarios">
                      <GitCompare className="w-4 h-4 mr-2" />
                      Compare Scenarios
                    </a>
                  </Button>
                  <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="default">
                        <Save className="w-4 h-4 mr-2" />
                        Save Scenario
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Save Current Scenario</DialogTitle>
                        <DialogDescription>
                          Save your current settings as a named scenario
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="scenarioName">Scenario Name</Label>
                          <Input
                            id="scenarioName"
                            placeholder="e.g., Retire at 55"
                            value={scenarioName}
                            onChange={(e) => setScenarioName(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="scenarioDescription">Description (optional)</Label>
                          <Input
                            id="scenarioDescription"
                            placeholder="e.g., Lower pension, earlier retirement"
                            value={scenarioDescription}
                            onChange={(e) => setScenarioDescription(e.target.value)}
                          />
                        </div>
                        <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                          <p className="font-medium mb-1">Current settings:</p>
                          <p>Pension: £{pensionValue.toLocaleString()} | ISA: £{isaValue.toLocaleString()} | GIA: £{giaValue.toLocaleString()}</p>
                          <p>Start Age: {startAge} | Growth: {growthRate}% | Withdrawal: {withdrawalRate}%</p>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveScenario} disabled={!scenarioName.trim()}>Save Scenario</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Inputs */}
          <Card className="overflow-hidden">
            <div className="px-6 py-4 border-b bg-muted/20 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Account Balances</h3>
                <p className="text-sm text-muted-foreground">Enter the value of each account type</p>
              </div>
            </div>
            <CardContent className="p-6">
              <div className="grid md:grid-cols-3 gap-6">
                {/* Pension */}
                <div className="space-y-3">
                  <Label htmlFor="pensionValue" className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" style={{ color: "#22c55e" }} />
                    <span className="font-medium">Pension Pot</span>
                  </Label>
                  <Input
                    id="pensionValue"
                    type="number"
                    step="10000"
                    value={pensionValue}
                    onChange={(e) => setPensionValue(Number(e.target.value))}
                    className="text-lg h-11"
                  />
                  <p className="text-xs text-muted-foreground">25% tax-free, rest taxed as income</p>
                </div>

                {/* ISA */}
                <div className="space-y-3">
                  <Label htmlFor="isaValue" className="flex items-center gap-2">
                    <PiggyBank className="h-4 w-4" style={{ color: "#3b82f6" }} />
                    <span className="font-medium">ISA Value</span>
                  </Label>
                  <Input
                    id="isaValue"
                    type="number"
                    step="10000"
                    value={isaValue}
                    onChange={(e) => setIsaValue(Number(e.target.value))}
                    className="text-lg h-11"
                  />
                  <p className="text-xs text-muted-foreground">Completely tax-free withdrawals</p>
                </div>

                {/* GIA */}
                <div className="space-y-3">
                  <Label htmlFor="giaValue" className="flex items-center gap-2">
                    <Wallet className="h-4 w-4" style={{ color: "#f97316" }} />
                    <span className="font-medium">GIA Value</span>
                  </Label>
                  <Input
                    id="giaValue"
                    type="number"
                    step="10000"
                    value={giaValue}
                    onChange={(e) => setGiaValue(Number(e.target.value))}
                    className="text-lg h-11"
                  />
                  <p className="text-xs text-muted-foreground">Taxed on gains within income brackets</p>
                </div>
              </div>

              <div className="mt-6 p-4 bg-gradient-to-r from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 border border-emerald-200/50 dark:border-emerald-800/50 rounded-xl">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Total Portfolio</span>
                  <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">£{totalPortfolio.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Other Settings */}
          <Card className="overflow-hidden">
            <div className="px-6 py-4 border-b bg-muted/20 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Retirement Settings</h3>
                <p className="text-sm text-muted-foreground">Configure your retirement timeline and assumptions</p>
              </div>
            </div>
            <CardContent className="p-6">
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Starting Age */}
                <div className="space-y-3">
                  <Label htmlFor="startAge" className="font-medium">Retirement Start Age</Label>
                  <Input
                    id="startAge"
                    type="number"
                    min={18}
                    max={80}
                    value={startAge}
                    onChange={(e) => setStartAge(Number(e.target.value))}
                    className="h-11"
                  />
                </div>

                {/* State Pension Settings - Link to Settings */}
                <div className="space-y-3">
                  <Label className="font-medium">State Pension</Label>
                  <div className="p-4 bg-gradient-to-r from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20 border border-purple-200/50 dark:border-purple-800/50 rounded-xl">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-lg">£{statePension.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">Age {statePensionAge}</p>
                      </div>
                      <a
                        href="/settings"
                        className="text-sm text-purple-600 hover:text-purple-800 hover:underline font-medium"
                      >
                        Edit
                      </a>
                    </div>
                  </div>
                </div>

                {/* Growth Rate */}
                <div className="space-y-3">
                  <Label htmlFor="growthRate" className="font-medium">Annual Growth Rate</Label>
                  <Select value={growthRate.toString()} onValueChange={(v) => setGrowthRate(Number(v))}>
                    <SelectTrigger className="h-11" aria-label="Select growth rate">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((rate) => (
                        <SelectItem key={rate} value={rate.toString()}>
                          {rate}%
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Withdrawal Rate */}
                <div className="space-y-3">
                  <Label htmlFor="withdrawalRate" className="font-medium">Annual Withdrawal Rate</Label>
                  <Select value={withdrawalRate.toString()} onValueChange={(v) => setWithdrawalRate(Number(v))}>
                    <SelectTrigger className="h-11" aria-label="Select withdrawal rate">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rate) => (
                        <SelectItem key={rate} value={rate.toString()}>
                          {rate}%
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Charts */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Income Chart */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <PoundSterling className="w-5 h-5 text-emerald-600" />
                      Annual Income by Source
                    </CardTitle>
                    <CardDescription>Income from each account type</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ChartContainer config={incomeConfig} className="h-[320px] w-full">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="age" 
                      stroke="hsl(var(--muted-foreground))" 
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} 
                      tickLine={false} 
                      tickMargin={8} 
                      axisLine={false} 
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))" 
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} 
                      tickLine={false} 
                      tickMargin={8} 
                      tickFormatter={(v) => `£${(v/1000).toFixed(0)}k`} 
                      axisLine={false}
                      width={55}
                    />
                    <ChartTooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        const total = payload.reduce((sum, entry) => sum + (Number(entry.value) || 0), 0);
                        return (
                          <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg text-sm min-w-[200px]">
                            <div className="font-semibold border-b border-border pb-1.5 mb-1.5">Age {label}</div>
                            {payload.map((entry: { dataKey?: string | number; value?: number | string | (string | number)[]; color?: string }) => (
                              <div key={String(entry.dataKey)} className="flex justify-between gap-4">
                                <span className="text-muted-foreground flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
                                  {incomeConfig[String(entry.dataKey) as keyof typeof incomeConfig]?.label || String(entry.dataKey)}
                                </span>
                                <span className="font-medium">£{(entry.value ?? 0).toLocaleString("en-US", { minimumFractionDigits: 0 })}</span>
                              </div>
                            ))}
                            <div className="flex justify-between gap-4 border-t border-border pt-1.5 mt-1.5 font-semibold">
                              <span className="text-muted-foreground">Total</span>
                              <span>£{total.toLocaleString("en-US", { minimumFractionDigits: 0 })}</span>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <ChartLegend 
                      wrapperStyle={{ paddingTop: "16px" }}
                      formatter={(value) => <span className="text-sm font-medium text-foreground">{incomeConfig[String(value) as keyof typeof incomeConfig]?.label || value}</span>}
                    />
                    <Bar dataKey="takeHomePay" stackId="a" fill="#22c55e" radius={[0, 0, 2, 2]} />
                    <Bar dataKey="isaWithdrawal" stackId="a" fill="#3b82f6" />
                    <Bar dataKey="giaWithdrawal" stackId="a" fill="#f97316" />
                    <Bar dataKey="statePension" stackId="a" fill="#8b5cf6" />
                    <Bar dataKey="incomeTax" stackId="a" fill="#ef4444" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Pot Value Chart */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-blue-600" />
                      Account Values Over Time
                    </CardTitle>
                    <CardDescription>Projected value of each account</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ChartContainer config={potConfig} className="h-[320px] w-full">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPension" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorISA" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorGIA" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="age" 
                      stroke="hsl(var(--muted-foreground))" 
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} 
                      tickLine={false} 
                      tickMargin={8} 
                      axisLine={false} 
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))" 
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} 
                      tickLine={false} 
                      tickMargin={8} 
                      tickFormatter={(v) => `£${(v/1000000).toFixed(1)}M`} 
                      axisLine={false}
                      width={55}
                    />
                    <ChartTooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        const total = payload.reduce((sum, entry) => sum + (Number(entry.value) || 0), 0);
                        return (
                          <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg text-sm min-w-[200px]">
                            <div className="font-semibold border-b border-border pb-1.5 mb-1.5">Age {label}</div>
                            {payload.map((entry: { dataKey?: string | number; value?: number | string | (string | number)[]; color?: string }) => (
                              <div key={String(entry.dataKey)} className="flex justify-between gap-4">
                                <span className="text-muted-foreground flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
                                  {potConfig[String(entry.dataKey) as keyof typeof potConfig]?.label || String(entry.dataKey)}
                                </span>
                                <span className="font-medium">£{((entry.value ?? 0) as number).toLocaleString("en-US", { minimumFractionDigits: 0 })}</span>
                              </div>
                            ))}
                            <div className="flex justify-between gap-4 border-t border-border pt-1.5 mt-1.5 font-semibold">
                              <span className="text-muted-foreground">Total</span>
                              <span>£{total.toLocaleString("en-US", { minimumFractionDigits: 0 })}</span>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <ChartLegend 
                      wrapperStyle={{ paddingTop: "16px" }}
                      formatter={(value) => <span className="text-sm font-medium text-foreground">{potConfig[String(value) as keyof typeof potConfig]?.label || value}</span>}
                    />
                    <Line type="monotone" dataKey="pensionPot" stroke="#22c55e" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="isaPot" stroke="#3b82f6" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="giaPot" stroke="#f97316" strokeWidth={2} dot={false} />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Table */}
          <Card className="overflow-hidden">
            <div className="px-6 py-4 border-b bg-muted/20 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Year-by-Year Breakdown</h3>
                <p className="text-sm text-muted-foreground">Detailed projection by age</p>
              </div>
            </div>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Age</th>
                      <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pension</th>
                      <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">ISA</th>
                      <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">GIA</th>
                      <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Pot</th>
                      <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Withdrawal</th>
                      <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tax</th>
                      <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Take Home</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {chartData.filter((_, i) => i % 5 === 0 || i === chartData.length - 1).map((year) => (
                      <tr key={year.age} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-3 font-medium">{year.age}</td>
                        <td className="text-right px-6 py-3">£{year.pensionPot.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                        <td className="text-right px-6 py-3">£{year.isaPot.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                        <td className="text-right px-6 py-3">£{year.giaPot.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                        <td className="text-right px-6 py-3 font-medium">£{year.totalPot.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                        <td className="text-right px-6 py-3">£{year.totalWithdrawal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                        <td className="text-right px-6 py-3 text-destructive">£{year.incomeTax.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                        <td className="text-right px-6 py-3 font-semibold text-emerald-600 dark:text-emerald-400">£{year.takeHomePay.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Assumptions & Disclaimers */}
          <Card className="overflow-hidden">
            <Accordion type="single" collapsible className="w-full border-0">
              <AccordionItem value="assumptions" className="border-b-0">
                <AccordionTrigger className="px-6 hover:no-underline hover:bg-muted/50 px-6 py-4">
                  <span className="font-semibold">Model Assumptions</span>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4">
                  <ul className="list-disc pl-4 space-y-2 text-sm text-muted-foreground">
                    <li><span className="font-medium text-foreground">Pension:</span> 25% tax-free lump sum, remaining 75% taxed as income</li>
                    <li><span className="font-medium text-foreground">ISA:</span> Completely tax-free withdrawals (contributions already taxed)</li>
                    <li><span className="font-medium text-foreground">GIA:</span> Entire withdrawal treated as taxable income (simplified)</li>
                    <li>Growth is applied annually before withdrawals</li>
                    <li>Withdrawals are taken proportionally from each account</li>
                    <li>State pension begins at the specified age and continues for life</li>
                    <li>All figures are in today&apos;s pounds (inflation not explicitly modeled)</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="limitations" className="border-b-0">
                <AccordionTrigger className="px-6 hover:no-underline hover:bg-muted/50 py-4">
                  <span className="font-semibold">Limitations</span>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4">
                  <ul className="list-disc pl-4 space-y-2 text-sm text-muted-foreground">
                    <li>Market volatility is not modeled - returns are assumed constant</li>
                    <li>Sequence of returns risk is not accounted for</li>
                    <li>Tax rates may change in future years</li>
                    <li>State pension age and amount may change</li>
                    <li>GIA calculation is simplified - only gains should be taxed, not original contributions</li>
                    <li>ISA allowance limits not considered</li>
                    <li>No allowance for investment fees or advice costs</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="disclaimer" className="border-b-0">
                <AccordionTrigger className="px-6 hover:no-underline hover:bg-muted/50 py-4">
                  <span className="font-semibold">Important Disclaimer</span>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    This calculator provides illustrative projections based on the assumptions you enter.
                    It is not financial advice and should not be used as the sole basis for retirement decisions.
                    Results are not guaranteed and your actual outcomes may differ significantly.
                    Please consult a qualified financial adviser for personalized advice.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>
        </div>
      </main>
    </div>
  );
}
