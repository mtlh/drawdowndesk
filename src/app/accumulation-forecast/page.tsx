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
import { Trash2, Plus } from "lucide-react";
import { useState, useMemo } from "react";

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
  const [currentAge, setCurrentAge] = useState(25);
  const [retirementAge, setRetirementAge] = useState(65);
  const [annualReturn, setAnnualReturn] = useState(5);
  const [inflation, setInflation] = useState(2);
  const [contributionMode, setContributionMode] = useState<"yearly" | "manual">("yearly");
  const [accounts, setAccounts] = useState<AccountForecast[]>([
    { id: "1", accountType: "GIA", startingBalance: 0, yearlyContribution: 0, contributions: [] }
  ]);

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

  // Calculate the forecast
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
    <div className="font-sans min-h-screen p-6 gap-4 bg-background">
      {/* Assumptions row */}
      <div className="flex flex-wrap items-end gap-4 mb-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">Age</label>
          <Input
            type="number"
            className="w-20 h-9"
            value={currentAge}
            onChange={(e) => setCurrentAge(parseInt(e.target.value) || 25)}
          />
          <span className="text-muted-foreground">→</span>
          <Input
            type="number"
            className="w-20 h-9"
            value={retirementAge}
            onChange={(e) => setRetirementAge(parseInt(e.target.value) || 65)}
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">Return</label>
          <Input
            type="number"
            className="w-20 h-9"
            value={annualReturn}
            onChange={(e) => setAnnualReturn(parseFloat(e.target.value) || 0)}
          />
          <span className="text-muted-foreground">%</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">Inflation</label>
          <Input
            type="number"
            className="w-20 h-9"
            value={inflation}
            onChange={(e) => setInflation(parseFloat(e.target.value) || 0)}
          />
          <span className="text-muted-foreground">%</span>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Button
            size="sm"
            variant={contributionMode === "yearly" ? "default" : "outline"}
            onClick={() => setContributionMode("yearly")}
            className="h-9"
          >
            Yearly
          </Button>
          <Button
            size="sm"
            variant={contributionMode === "manual" ? "default" : "outline"}
            onClick={() => setContributionMode("manual")}
            className="h-9"
          >
            Manual
          </Button>
        </div>
      </div>

      {/* Accounts table */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold">Accounts</h2>
          <Button size="sm" variant="outline" onClick={addAccount} className="h-8">
            <Plus className="w-4 h-4 mr-1" />
            Add Account
          </Button>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium w-32">Account</th>
                <th className="text-right p-3 font-medium">Start Balance (£)</th>
                {contributionMode === "yearly" && <th className="text-right p-3 font-medium">Yearly (£)</th>}
                <th className="p-3 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account, accountIndex) => (
                <tr key={account.id} className="border-t">
                  <td className="p-3">
                    <Select value={account.accountType} onValueChange={(v) => updateAccountField(accountIndex, "accountType", v)}>
                      <SelectTrigger className="w-full h-9">
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
                  <td className="p-3">
                    <Input
                      type="number"
                      className="h-9 w-full text-right"
                      value={account.startingBalance}
                      onChange={(e) => updateAccountField(accountIndex, "startingBalance", e.target.value)}
                    />
                  </td>
                  {contributionMode === "yearly" && (
                    <td className="p-3">
                      <Input
                        type="number"
                        className="h-9 w-full text-right"
                        value={account.yearlyContribution}
                        onChange={(e) => updateAccountField(accountIndex, "yearlyContribution", e.target.value)}
                      />
                    </td>
                  )}
                  <td className="p-3">
                    {accounts.length > 1 && (
                      <Button variant="ghost" size="icon" onClick={() => removeAccount(accountIndex)} className="h-8 w-8" aria-label="Remove account">
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
          <div className="mt-3 p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium">One-off contributions</span>
              <Button size="sm" variant="outline" onClick={() => addContribution(0)} className="h-8">
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {accounts[0]?.contributions.map((contrib, contribIndex) => (
                <div key={contrib.id} className="flex items-center gap-2 bg-background p-2 rounded border">
                  <Input
                    type="number"
                    className="h-8 w-16 text-center"
                    value={contrib.age}
                    onChange={(e) => updateContribution(0, contribIndex, "age", parseInt(e.target.value) || 0)}
                  />
                  <span className="text-muted-foreground">:</span>
                  <Input
                    type="number"
                    className="h-8 w-28"
                    value={contrib.amount}
                    onChange={(e) => updateContribution(0, contribIndex, "amount", parseFloat(e.target.value) || 0)}
                  />
                  <Button variant="ghost" size="icon" onClick={() => removeContribution(0, contribIndex)} className="h-8 w-8" aria-label="Remove contribution">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Account breakdown - above chart */}
      {accountTotals.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          {accountTotals.map((account, index) => (
            <div key={index} className="p-4 border rounded-lg">
              <div className="font-semibold mb-2">{account.type}</div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Value</span>
                <span className="font-medium">£{account.finalValue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Growth</span>
                <span className="font-medium text-green-600">+£{account.growth.toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Results - chart with metrics */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-base">Forecast</CardTitle>
              <CardDescription>Age {currentAge} to {retirementAge}</CardDescription>
            </div>
            <div className="flex gap-4">
              <div className="text-right">
                <div className="text-muted-foreground text-xs">Final Value</div>
                <div className="font-bold text-lg">£{finalValues.value.toLocaleString()}</div>
              </div>
              <div className="text-right">
                <div className="text-muted-foreground text-xs">Contributions</div>
                <div className="font-bold text-lg">£{finalValues.contributions.toLocaleString()}</div>
              </div>
              <div className="text-right">
                <div className="text-muted-foreground text-xs">Growth</div>
                <div className="font-bold text-lg text-green-600">£{finalValues.growth.toLocaleString()}</div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <AreaChart
              data={forecastData}
              margin={{ top: 10, left: 10, right: 10 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="age"
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
                tickMargin={5}
                tickFormatter={(v) => v.toString()}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={(value) => `£${(value / 1000).toFixed(0)}k`}
                width={50}
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
                stroke="var(--chart-1)"
                fill="var(--chart-1)"
                fillOpacity={0.3}
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
