"use client"

import { SignIn } from "@/components/SignIn"
import { Button } from "@/components/ui/button"
import { Github, TrendingUp, BarChart3, PieChart as PieChartIcon } from "lucide-react"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts"

export default function SignInPage() {
  // Sample data for charts
  const portfolioData = [
    { name: "Stocks", value: 45, color: "#4F46E5" },
    { name: "Bonds", value: 30, color: "#10B981" },
    { name: "Real Estate", value: 15, color: "#F59E0B" },
    { name: "Cash", value: 10, color: "#8B5CF6" },
  ]

  const cashflowData = [
    { month: "Jan", value: 12000 },
    { month: "Feb", value: 15000 },
    { month: "Mar", value: 18000 },
    { month: "Apr", value: 16000 },
    { month: "May", value: 21000 },
    { month: "Jun", value: 24000 },
  ]

  const goalsData = [
    { name: "Retirement", progress: 68 },
    { name: "Emergency Fund", progress: 92 },
    { name: "House Down Payment", progress: 45 },
  ]

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">
      {/* Left side - Branding and features */}
      <div className="lg:w-5/12 p-8 lg:p-12 flex flex-col justify-center text-foreground bg-card/50 border-r border-border">
        <div className="space-y-12">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary text-primary-foreground flex items-center justify-center rounded-xl font-bold text-xl shadow-lg">
              DD
            </div>
            <span className="text-2xl font-bold">Drawdown Desk</span>
          </div>

          {/* Main heading */}
          <div>
            <h1 className="text-4xl lg:text-5xl font-bold mb-6 leading-tight">
              Your finances,<br />
              <span className="text-primary">perfectly synced</span>
            </h1>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Track investments, simulate returns, and plan your retirement with professional-grade analytics.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Real-time portfolio tracking</h3>
                <p className="text-sm text-muted-foreground">Live prices and automatic updates keep your portfolio accurate.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                <BarChart3 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Monte Carlo simulations</h3>
                <p className="text-sm text-muted-foreground">Project future returns with historical market data modeling.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                <PieChartIcon className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">UK tax calculations</h3>
                <p className="text-sm text-muted-foreground">Built-in tax bands for retirement income and capital gains.</p>
              </div>
            </div>
          </div>

          {/* Buttons - Centered in left panel */}
          <div className="flex items-center justify-center gap-4 pt-8">
            <a href="https://github.com/mtlh/drawdowndesk" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="gap-2">
                <Github className="w-4 h-4" />
                GitHub
              </Button>
            </a>
            <SignIn />
          </div>
        </div>
      </div>

      {/* Right side - Sign in and dashboard preview */}
      <div className="lg:w-7/12 p-6 lg:p-12 flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center">
          {/* Dashboard Preview */}
          <div className="w-full max-w-lg mb-10">
            <div className="bg-card rounded-2xl border border-border shadow-xl overflow-hidden">
              {/* Dashboard header */}
              <div className="bg-muted/50 px-5 py-3 border-b border-border flex items-center justify-between">
                <span className="text-sm font-medium">Portfolio Overview</span>
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
                </div>
              </div>

              <div className="p-5 space-y-4">
                {/* Asset Allocation - Donut */}
                <div className="bg-muted/30 rounded-xl p-4">
                  <h4 className="text-sm font-semibold mb-3">Asset Allocation</h4>
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width={140} height={140}>
                      <PieChart>
                        <Pie
                          data={portfolioData}
                          dataKey="value"
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={55}
                          paddingAngle={3}
                        >
                          {portfolioData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-1.5">
                      {portfolioData.map((item, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                          <span className="text-xs text-muted-foreground">{item.name}</span>
                          <span className="text-xs font-medium ml-auto">{item.value}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Cashflow Line Chart */}
                <div className="bg-muted/30 rounded-xl p-4">
                  <h4 className="text-sm font-semibold mb-3">Monthly Cashflow</h4>
                  <ResponsiveContainer width="100%" height={120}>
                    <LineChart data={cashflowData}>
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" style={{ fontSize: "11px" }} tickLine={false} axisLine={false} />
                      <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: "11px" }} tickLine={false} axisLine={false} tickFormatter={(v) => `£${v/1000}k`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                        labelStyle={{ color: "hsl(var(--foreground))" }}
                      />
                      <Line type="monotone" dataKey="value" stroke="#4F46E5" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Goals Progress Bar */}
                <div className="bg-muted/30 rounded-xl p-4">
                  <h4 className="text-sm font-semibold mb-3">Financial Goals</h4>
                  <div className="space-y-2">
                    {goalsData.map((goal, index) => (
                      <div key={index}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">{goal.name}</span>
                          <span className="font-medium">{goal.progress}%</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${goal.progress}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
