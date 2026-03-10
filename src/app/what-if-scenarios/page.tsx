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
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartTooltip,
} from "@/components/ui/chart";
import {
  CartesianGrid,
  XAxis,
  YAxis,
  Line,
  LineChart,
} from "recharts";
import { FolderOpen, Trash2, GitCompare, Plus, AlertCircle } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { CreateTakeHome, TaxInfo } from "@/lib/createTakeHome";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

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

function calculateCashflowScenario(
  pensionValue: number,
  isaValue: number,
  giaValue: number,
  annualGrowthRate: number,
  withdrawalRate: number,
  startAge: number,
  statePension: number,
  statePensionAge: number,
  taxInfo: TaxInfo
): { chartData: CashflowYear[]; summary: SummaryMetrics } {
  const endAge = 100;

  let pensionPot = pensionValue;
  let isaPot = isaValue;
  let giaPot = giaValue;

  const years: CashflowYear[] = [];
  let yearsUntilDepleted = endAge - startAge;
  let finalTotalValue = 0;

  for (let age = startAge; age <= endAge; age++) {
    const pensionGrowth = pensionPot * annualGrowthRate;
    const isaGrowth = isaPot * annualGrowthRate;
    const giaGrowth = giaPot * annualGrowthRate;

    pensionPot += pensionGrowth;
    isaPot += isaGrowth;
    giaPot += giaGrowth;

    const currentStatePension = age >= statePensionAge ? statePension : 0;

    const totalPot = pensionPot + isaPot + giaPot;
    const withdrawal = totalPot > 0 ? Math.min(totalPot * withdrawalRate, totalPot) : 0;

    let pensionWithdrawal = 0;
    let isaWithdrawal = 0;
    let giaWithdrawal = 0;

    if (withdrawal > 0 && totalPot > 0) {
      const ratio = withdrawal / totalPot;
      pensionWithdrawal = pensionPot * ratio;
      isaWithdrawal = isaPot * ratio;
      giaWithdrawal = giaPot * ratio;
    }

    pensionPot -= pensionWithdrawal;
    isaPot -= isaWithdrawal;
    giaPot -= giaWithdrawal;

    pensionPot = Math.max(0, pensionPot);
    isaPot = Math.max(0, isaPot);
    giaPot = Math.max(0, giaPot);

    const pensionTaxFree = pensionWithdrawal * 0.25;
    const pensionTaxed = pensionWithdrawal * 0.75;
    const isaTaxFree = isaWithdrawal;
    const giaTaxable = giaWithdrawal;

    const totalTaxableIncome = pensionTaxed + giaTaxable + currentStatePension;

    const taxResult = CreateTakeHome(taxInfo, totalTaxableIncome);
    const hasError = 'error' in taxResult && taxResult.error;

    const incomeTax = hasError ? 0 : (taxResult as { incomeTax: number }).incomeTax;
    const nationalInsurance = hasError ? 0 : (taxResult as { nationalInsurance: number }).nationalInsurance;

    let pensionIncomeTax = 0;
    let giaIncomeTax = 0;
    if (totalTaxableIncome > 0) {
      pensionIncomeTax = pensionTaxed > 0 ? (pensionTaxed / totalTaxableIncome) * incomeTax : 0;
      giaIncomeTax = giaTaxable > 0 ? (giaTaxable / totalTaxableIncome) * incomeTax : 0;
    }

    const pensionTakeHome = pensionTaxFree + (pensionTaxed - pensionIncomeTax);
    const isaTakeHome = isaTaxFree;
    const giaTakeHome = giaTaxable - giaIncomeTax;
    const statePensionTakeHome = currentStatePension - (currentStatePension > 0 ? ((currentStatePension / totalTaxableIncome) * incomeTax || 0) : 0);

    const totalTakeHome = pensionTakeHome + isaTakeHome + giaTakeHome + statePensionTakeHome;

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
}

type CurrentUserResult = { _id: string } | null;

function useCurrentUserQuery(): CurrentUserResult | undefined {
  return useQuery(api.currentUser.getCurrentUser.getCurrentUser);
}

function useTaxInfoQuery(userId: string | undefined): TaxInfo {
  return useQuery(api.tax.runTaxQuery.getTaxInfoForIncome, {
    taxYear: 2025,
    userId: userId as Id<"users"> | undefined
  }) as TaxInfo;
}

type UserSettings = {
  statePensionAmount: number;
  statePensionAge: number;
  defaultGrowthRate: number;
  defaultInflationRate: number;
};

function useUserSettingsQuery(userId: string | undefined): UserSettings | undefined {
  return useQuery(
    api.tax.userSettings.getUserSettings,
    userId ? { userId: userId as Id<"users"> } : "skip"
  ) as UserSettings | undefined;
}

interface SavedScenario {
  _id: Id<"scenarios">;
  userId: Id<"users">;
  name: string;
  description?: string;
  pensionValue: number;
  isaValue: number;
  giaValue: number;
  growthRate: number;
  withdrawalRate: number;
  startAge: number;
  statePension: number;
  statePensionAge: number;
  lastUpdated?: string;
}

function useScenariosQuery(): SavedScenario[] {
  return useQuery(api.scenarios.scenarioCrud.getScenarios) as SavedScenario[] || [];
}

export default function WhatIfScenarios() {
  const user = useCurrentUserQuery();
  const taxBandInformation = useTaxInfoQuery(user?._id);
  const userSettings = useUserSettingsQuery(user?._id);
  const scenarios = useScenariosQuery();
  const createScenario = useMutation(api.scenarios.scenarioCrud.createScenario);
  const deleteScenario = useMutation(api.scenarios.scenarioCrud.deleteScenario);

  const [selectedScenarios, setSelectedScenarios] = useState<Id<"scenarios">[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newScenario, setNewScenario] = useState({
    name: "",
    description: "",
    pensionValue: 500000,
    isaValue: 100000,
    giaValue: 100000,
    growthRate: 5,
    withdrawalRate: 3,
    startAge: 55,
    statePension: 11000,
    statePensionAge: 67,
  });

  // Calculate comparison data - must be called before any early returns
  const comparisonData = useMemo(() => {
    if (!taxBandInformation || selectedScenarios.length === 0) return [];
    
    return selectedScenarios.map(scenarioId => {
      const scenario = scenarios.find(s => s._id === scenarioId);
      if (!scenario) return null;
      
      const result = calculateCashflowScenario(
        scenario.pensionValue,
        scenario.isaValue,
        scenario.giaValue,
        scenario.growthRate / 100,
        scenario.withdrawalRate / 100,
        scenario.startAge,
        scenario.statePension,
        scenario.statePensionAge,
        taxBandInformation
      );
      
      return {
        id: scenario._id,
        name: scenario.name,
        summary: result.summary,
        chartData: result.chartData,
        totalPortfolio: scenario.pensionValue + scenario.isaValue + scenario.giaValue,
        startAge: scenario.startAge,
      };
    }).filter(Boolean);
  }, [selectedScenarios, scenarios, taxBandInformation]);

  const comparisonSummary = comparisonData.map(s => ({
    name: s!.name,
    totalPortfolio: s!.totalPortfolio,
    startAge: s!.startAge,
    totalTakeHome: s!.summary.totalTakeHome,
    totalTax: s!.summary.totalTax,
    yearsUntilDepleted: s!.summary.yearsUntilDepleted,
    finalTotalValue: s!.summary.finalTotalValue,
  }));

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

  const handleCreateScenario = async () => {
    if (!newScenario.name.trim()) return;
    try {
      await createScenario({
        name: newScenario.name.trim(),
        description: newScenario.description.trim() || undefined,
        pensionValue: newScenario.pensionValue,
        isaValue: newScenario.isaValue,
        giaValue: newScenario.giaValue,
        growthRate: newScenario.growthRate,
        withdrawalRate: newScenario.withdrawalRate,
        startAge: newScenario.startAge,
        statePension: newScenario.statePension,
        statePensionAge: newScenario.statePensionAge,
      });
      setCreateDialogOpen(false);
      setNewScenario({
        name: "",
        description: "",
        pensionValue: 500000,
        isaValue: 100000,
        giaValue: 100000,
        growthRate: 5,
        withdrawalRate: 3,
        startAge: 55,
        statePension: userSettings.statePensionAmount,
        statePensionAge: userSettings.statePensionAge,
      });
    } catch (error) {
      console.error("Failed to save scenario:", error);
    }
  };

  const toggleScenario = (scenarioId: Id<"scenarios">) => {
    setSelectedScenarios(prev => 
      prev.includes(scenarioId)
        ? prev.filter(id => id !== scenarioId)
        : prev.length < 4
          ? [...prev, scenarioId]
          : prev
    );
  };

  return (
    <div className="flex min-h-screen bg-background">
      <main className="flex-1 overflow-y-auto overflow-x-hidden bg-background pr-4">
        <div className="p-4 lg:p-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-600 to-violet-700 flex items-center justify-center shadow-lg shadow-violet-600/20">
                <GitCompare className="w-7 h-7 text-white" />
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">What-If Analysis</div>
                <div className="text-4xl font-bold tracking-tight">Retirement Scenarios</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Compare different retirement strategies side-by-side
                </div>
              </div>
            </div>
          </div>

          {/* Create New Scenario */}
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Create New Scenario
              </CardTitle>
              <CardDescription>Set up a new retirement scenario to compare</CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Add New Scenario
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create New Scenario</DialogTitle>
                    <DialogDescription>
                      Define the parameters for your retirement scenario
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
                    <div className="space-y-2">
                      <Label>Scenario Name</Label>
                      <Input
                        placeholder="e.g., Retire at 55 with £600k"
                        value={newScenario.name}
                        onChange={(e) => setNewScenario(s => ({ ...s, name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description (optional)</Label>
                      <Input
                        placeholder="e.g., Higher risk, earlier retirement"
                        value={newScenario.description}
                        onChange={(e) => setNewScenario(s => ({ ...s, description: e.target.value }))}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Pension (£)</Label>
                        <Input
                          type="number"
                          value={newScenario.pensionValue}
                          onChange={(e) => setNewScenario(s => ({ ...s, pensionValue: Number(e.target.value) }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>ISA (£)</Label>
                        <Input
                          type="number"
                          value={newScenario.isaValue}
                          onChange={(e) => setNewScenario(s => ({ ...s, isaValue: Number(e.target.value) }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>GIA (£)</Label>
                        <Input
                          type="number"
                          value={newScenario.giaValue}
                          onChange={(e) => setNewScenario(s => ({ ...s, giaValue: Number(e.target.value) }))}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Start Age</Label>
                        <Input
                          type="number"
                          value={newScenario.startAge}
                          onChange={(e) => setNewScenario(s => ({ ...s, startAge: Number(e.target.value) }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Growth Rate (%)</Label>
                        <Select 
                          value={newScenario.growthRate.toString()} 
                          onValueChange={(v) => setNewScenario(s => ({ ...s, growthRate: Number(v) }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((rate) => (
                              <SelectItem key={rate} value={rate.toString()}>{rate}%</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Withdrawal Rate (%)</Label>
                        <Select 
                          value={newScenario.withdrawalRate.toString()} 
                          onValueChange={(v) => setNewScenario(s => ({ ...s, withdrawalRate: Number(v) }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rate) => (
                              <SelectItem key={rate} value={rate.toString()}>{rate}%</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>State Pension (£/yr)</Label>
                        <Input
                          type="number"
                          value={newScenario.statePension}
                          onChange={(e) => setNewScenario(s => ({ ...s, statePension: Number(e.target.value) }))}
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreateScenario} disabled={!newScenario.name.trim()}>
                      Create Scenario
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          {/* Saved Scenarios */}
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5" />
                Saved Scenarios
              </CardTitle>
              <CardDescription>
                Select 2-4 scenarios to compare. Click on a scenario to view details.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {scenarios.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">No scenarios yet</p>
                  <p className="text-sm">Create your first scenario above to get started</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {scenarios.map((scenario) => (
                    <div
                      key={scenario._id}
                      className={`flex items-center justify-between p-4 rounded-lg border transition-all ${
                        selectedScenarios.includes(scenario._id)
                          ? "border-primary bg-primary/10"
                          : "hover:bg-muted/50 border-border"
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-lg">{scenario.name}</div>
                        <div className="text-sm text-muted-foreground">
                          <span className="font-medium">Age {scenario.startAge}</span>
                          <span className="mx-2">•</span>
                          <span>£{((scenario.pensionValue + scenario.isaValue + scenario.giaValue) / 1000).toFixed(0)}k</span>
                          <span className="mx-2">•</span>
                          <span>{scenario.growthRate}% growth</span>
                          <span className="mx-2">•</span>
                          <span>{scenario.withdrawalRate}% withdrawal</span>
                        </div>
                        {scenario.description && (
                          <div className="text-sm text-muted-foreground mt-1">{scenario.description}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant={selectedScenarios.includes(scenario._id) ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleScenario(scenario._id)}
                        >
                          {selectedScenarios.includes(scenario._id) ? "Comparing" : "Compare"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm(`Delete "${scenario.name}"?`)) {
                              deleteScenario({ scenarioId: scenario._id });
                              setSelectedScenarios(prev => prev.filter(id => id !== scenario._id));
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Comparison Results */}
          {comparisonSummary.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <GitCompare className="w-6 h-6 text-primary" />
                <h2 className="text-2xl font-bold">Scenario Comparison</h2>
              </div>

              {/* Summary Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Summary Comparison</CardTitle>
                  <CardDescription>Key metrics across all selected scenarios</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/30">
                        <tr>
                          <th className="text-left px-4 py-3 font-semibold">Scenario</th>
                          <th className="text-right px-4 py-3 font-semibold">Total Portfolio</th>
                          <th className="text-right px-4 py-3 font-semibold">Start Age</th>
                          <th className="text-right px-4 py-3 font-semibold">Total Take Home</th>
                          <th className="text-right px-4 py-3 font-semibold">Total Tax</th>
                          <th className="text-right px-4 py-3 font-semibold">Money Lasts</th>
                          <th className="text-right px-4 py-3 font-semibold">Value at 100</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {comparisonSummary.map((s) => (
                          <tr key={s.name} className="hover:bg-muted/30">
                            <td className="px-4 py-3 font-medium">{s.name}</td>
                            <td className="text-right px-4 py-3">£{s.totalPortfolio.toLocaleString()}</td>
                            <td className="text-right px-4 py-3">{s.startAge}</td>
                            <td className="text-right px-4 py-3 text-emerald-600">£{(s.totalTakeHome / 1000).toFixed(0)}k</td>
                            <td className="text-right px-4 py-3 text-red-600">£{(s.totalTax / 1000).toFixed(0)}k</td>
                            <td className="text-right px-4 py-3 font-medium">
                              {s.yearsUntilDepleted > 100 - s.startAge ? "Forever" : `${s.yearsUntilDepleted} yrs`}
                            </td>
                            <td className="text-right px-4 py-3">
                              {s.finalTotalValue > 0 ? `£${(s.finalTotalValue / 1000000).toFixed(1)}M` : "£0"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Portfolio Survival Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Portfolio Survival Comparison</CardTitle>
                  <CardDescription>Total portfolio value over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer 
                    config={{
                      scenario0: { label: comparisonSummary[0]?.name || "Scenario 1", color: "#22c55e" },
                      scenario1: { label: comparisonSummary[1]?.name || "Scenario 2", color: "#3b82f6" },
                      scenario2: { label: comparisonSummary[2]?.name || "Scenario 3", color: "#f97316" },
                      scenario3: { label: comparisonSummary[3]?.name || "Scenario 4", color: "#8b5cf6" },
                    } as ChartConfig} 
                    className="h-[350px] w-full"
                  >
                    <LineChart data={comparisonData[0]?.chartData.map((_, ageIdx) => {
                      const dataPoint: Record<string, number | string> = { age: comparisonData[0]!.chartData[ageIdx]?.age || ageIdx + 55 };
                      comparisonData.forEach((scenario, idx) => {
                        if (scenario?.chartData[ageIdx]) {
                          dataPoint[`scenario${idx}`] = scenario.chartData[ageIdx].totalPot;
                        }
                      });
                      return dataPoint;
                    })}>
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
                        width={60}
                      />
                      <ChartTooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          return (
                            <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg text-sm">
                              <div className="font-semibold mb-1">Age {label}</div>
                              {payload.map((entry) => (
                                <div key={String(entry.dataKey)} className="flex justify-between gap-4">
                                  <span className="text-muted-foreground">{entry.name}</span>
                                  <span className="font-medium">£{((entry.value as number) || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                </div>
                              ))}
                            </div>
                          );
                        }}
                      />
                      <ChartLegend />
                      {comparisonData.map((scenario, idx) => (
                        <Line 
                          key={scenario!.id}
                          type="monotone" 
                          dataKey={`scenario${idx}`} 
                          name={scenario!.name}
                          stroke={["#22c55e", "#3b82f6", "#f97316", "#8b5cf6"][idx]} 
                          strokeWidth={2} 
                          dot={false} 
                        />
                      ))}
                    </LineChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Tax Comparison */}
              <Card>
                <CardHeader>
                  <CardTitle>Cumulative Tax Paid Comparison</CardTitle>
                  <CardDescription>Total tax paid over retirement period</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer 
                    config={{
                      tax0: { label: comparisonSummary[0]?.name || "Scenario 1", color: "#22c55e" },
                      tax1: { label: comparisonSummary[1]?.name || "Scenario 2", color: "#3b82f6" },
                      tax2: { label: comparisonSummary[2]?.name || "Scenario 3", color: "#f97316" },
                      tax3: { label: comparisonSummary[3]?.name || "Scenario 4", color: "#8b5cf6" },
                    } as ChartConfig} 
                    className="h-[350px] w-full"
                  >
                    <LineChart data={comparisonData[0]?.chartData.map((_, ageIdx) => {
                      const dataPoint: Record<string, number | string> = { age: comparisonData[0]!.chartData[ageIdx]?.age || ageIdx + 55 };
                      comparisonData.forEach((scenario, idx) => {
                        if (scenario?.chartData[ageIdx]) {
                          const cumulativeTax = scenario.chartData.slice(0, ageIdx + 1).reduce((sum, y) => sum + y.incomeTax, 0);
                          dataPoint[`tax${idx}`] = cumulativeTax;
                        }
                      });
                      return dataPoint;
                    })}>
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
                        width={60}
                      />
                      <ChartTooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          return (
                            <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg text-sm">
                              <div className="font-semibold mb-1">Age {label}</div>
                              {payload.map((entry) => (
                                <div key={String(entry.dataKey)} className="flex justify-between gap-4">
                                  <span className="text-muted-foreground">{entry.name}</span>
                                  <span className="font-medium">£{((entry.value as number) || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                </div>
                              ))}
                            </div>
                          );
                        }}
                      />
                      <ChartLegend />
                      {comparisonData.map((scenario, idx) => (
                        <Line 
                          key={scenario!.id}
                          type="monotone" 
                          dataKey={`tax${idx}`} 
                          name={scenario!.name}
                          stroke={["#22c55e", "#3b82f6", "#f97316", "#8b5cf6"][idx]} 
                          strokeWidth={2} 
                          dot={false} 
                        />
                      ))}
                    </LineChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Income Comparison */}
              <Card>
                <CardHeader>
                  <CardTitle>Annual Income Comparison</CardTitle>
                  <CardDescription>Take-home pay by age across scenarios</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer 
                    config={{
                      income0: { label: comparisonSummary[0]?.name || "Scenario 1", color: "#22c55e" },
                      income1: { label: comparisonSummary[1]?.name || "Scenario 2", color: "#3b82f6" },
                      income2: { label: comparisonSummary[2]?.name || "Scenario 3", color: "#f97316" },
                      income3: { label: comparisonSummary[3]?.name || "Scenario 4", color: "#8b5cf6" },
                    } as ChartConfig} 
                    className="h-[350px] w-full"
                  >
                    <LineChart data={comparisonData[0]?.chartData.map((_, ageIdx) => {
                      const dataPoint: Record<string, number | string> = { age: comparisonData[0]!.chartData[ageIdx]?.age || ageIdx + 55 };
                      comparisonData.forEach((scenario, idx) => {
                        if (scenario?.chartData[ageIdx]) {
                          dataPoint[`income${idx}`] = scenario.chartData[ageIdx].takeHomePay;
                        }
                      });
                      return dataPoint;
                    })}>
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
                        width={60}
                      />
                      <ChartTooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          return (
                            <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg text-sm">
                              <div className="font-semibold mb-1">Age {label}</div>
                              {payload.map((entry) => (
                                <div key={String(entry.dataKey)} className="flex justify-between gap-4">
                                  <span className="text-muted-foreground">{entry.name}</span>
                                  <span className="font-medium">£{((entry.value as number) || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                </div>
                              ))}
                            </div>
                          );
                        }}
                      />
                      <ChartLegend />
                      {comparisonData.map((scenario, idx) => (
                        <Line 
                          key={scenario!.id}
                          type="monotone" 
                          dataKey={`income${idx}`} 
                          name={scenario!.name}
                          stroke={["#22c55e", "#3b82f6", "#f97316", "#8b5cf6"][idx]} 
                          strokeWidth={2} 
                          dot={false} 
                        />
                      ))}
                    </LineChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
