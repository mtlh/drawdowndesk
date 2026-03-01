"use client"

import { SignIn } from "@/components/SignIn"
import { Button } from "@/components/ui/button"
import { Github, TrendingUp, BarChart3, Target, Wallet, Calculator, TrendingDown } from "lucide-react"
import Image from "next/image"
import favicon from "../app/favicon.ico"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
  BarChart,
  Bar,
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

  const performanceData = [
    { month: "W1", value: 100000 },
    { month: "W2", value: 102500 },
    { month: "W3", value: 101800 },
    { month: "W4", value: 104200 },
    { month: "W5", value: 106500 },
    { month: "W6", value: 108000 },
  ]

  return (
    <div className="min-h-screen flex items-center justify-center p-6 lg:p-10 relative overflow-hidden">
      {/* Background with dark overlay */}
      <div className="absolute inset-0 bg-[#0f172a]">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: 'url(/hero-bg.jpg)' }}
        />
        <div className="absolute inset-0 bg-white/20" />
      </div>

      {/* Main card - improved contrast */}
      <div className="relative w-[80vw] h-[85vh] min-w-[1000px] min-h-[700px] bg-white/5 backdrop-blur-md rounded-3xl shadow-2xl overflow-hidden flex flex-col lg:flex-row">
        {/* Left side - Login */}
        <div className="lg:w-5/12 p-8 lg:p-12 flex flex-col bg-white/5 overflow-hidden">
          {/* Logo with favicon - at top */}
          <div className="flex items-center gap-4">
            <Image src={favicon} alt="Drawdown Desk" width={48} height={48} className="rounded-xl" />
            <span className="text-3xl font-bold text-white">Drawdown Desk</span>
          </div>

          {/* Heading + Buttons - centered in middle */}
          <div className="mt-auto mb-auto">
            <div className="mb-8">
              <h1 className="text-5xl font-bold mb-3 text-white">
                Welcome back
              </h1>
              <p className="text-slate-300 text-lg">
                Sign in to track your investments.
              </p>
            </div>

            {/* Sign in buttons - same width */}
            <div className="space-y-4 w-full">
            <div className="w-full">
              <div className="group">
                <SignIn />
              </div>
            </div>
            <a href="https://github.com/mtlh/drawdowndesk" target="_blank" rel="noopener noreferrer" className="block w-full">
              <Button variant="outline" className="w-full gap-2 border-white/20 h-12 text-base hover:border-white/50 hover:bg-white/10 text-white bg-black/70 transition-all font-semibold shadow-md hover:shadow-lg">
                <Github className="w-5 h-5" />
                View on GitHub
              </Button>
            </a>
          </div>
          </div>
        </div>

        {/* Right side - Dashboard preview */}
        <div className="lg:w-7/12 bg-white/5 p-8 lg:p-12 overflow-hidden">
          {/* Dashboard preview card */}
          <div className="bg-white rounded-2xl border border-white/50 shadow-lg overflow-hidden h-full">
            {/* Dashboard header */}
            <div className="bg-slate-100/80 px-6 py-4 border-b border-slate-200/50 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">Portfolio Overview</span>
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
              </div>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto">
              {/* Top row - 3 small cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-50/80 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Wallet className="w-4 h-4 text-[#4F46E5]" />
                    <span className="text-xs font-medium text-slate-500">Total Value</span>
                  </div>
                  <div className="text-lg font-bold text-slate-800">£248,592</div>
                  <div className="text-xs text-emerald-600 flex items-center gap-1 mt-1">
                    <TrendingUp className="w-3 h-3" /> +12.4%
                  </div>
                </div>
                <div className="bg-slate-50/80 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-medium text-slate-500">YTD Return</span>
                  </div>
                  <div className="text-lg font-bold text-slate-800">+£24,850</div>
                  <div className="text-xs text-emerald-600 flex items-center gap-1 mt-1">
                    <TrendingUp className="w-3 h-3" /> +11.1%
                  </div>
                </div>
                <div className="bg-slate-50/80 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-medium text-slate-500">Goals</span>
                  </div>
                  <div className="text-lg font-bold text-slate-800">2/5</div>
                  <div className="text-xs text-slate-500 mt-1">completed</div>
                </div>
              </div>

              {/* Performance Chart */}
              <div className="bg-slate-50/80 rounded-xl p-5">
                <h4 className="text-sm font-semibold text-slate-700 mb-4">Portfolio Performance</h4>
                <ResponsiveContainer width="100%" height={120}>
                  <AreaChart data={performanceData}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" stroke="#94a3b8" style={{ fontSize: "11px" }} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" style={{ fontSize: "11px" }} tickLine={false} axisLine={false} tickFormatter={(v) => `£${v/1000}k`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "12px" }}
                      labelStyle={{ color: "#475569" }}
                      formatter={(value: number) => [`£${value.toLocaleString()}`, "Value"]}
                    />
                    <Area type="monotone" dataKey="value" stroke="#4F46E5" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Middle row - Allocation & Cashflow */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50/80 rounded-xl p-4">
                  <h4 className="text-sm font-semibold text-slate-700 mb-3">Asset Allocation</h4>
                  <div className="flex items-center gap-3">
                    <ResponsiveContainer width={100} height={100}>
                      <PieChart>
                        <Pie
                          data={portfolioData}
                          dataKey="value"
                          cx="50%"
                          cy="50%"
                          innerRadius={25}
                          outerRadius={40}
                          paddingAngle={3}
                        >
                          {portfolioData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-1">
                      {portfolioData.map((item, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                          <span className="text-xs text-slate-500">{item.name}</span>
                          <span className="text-xs font-medium text-slate-700 ml-auto">{item.value}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50/80 rounded-xl p-4">
                  <h4 className="text-sm font-semibold text-slate-700 mb-3">Monthly Cashflow</h4>
                  <ResponsiveContainer width="100%" height={100}>
                    <BarChart data={cashflowData}>
                      <XAxis dataKey="month" stroke="#94a3b8" style={{ fontSize: "10px" }} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" style={{ fontSize: "10px" }} tickLine={false} axisLine={false} tickFormatter={(v) => `£${v/1000}k`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "11px" }}
                        labelStyle={{ color: "#475569" }}
                      />
                      <Bar dataKey="value" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Goals */}
              <div className="bg-slate-50/80 rounded-xl p-5">
                <h4 className="text-sm font-semibold text-slate-700 mb-4">Financial Goals</h4>
                <div className="space-y-3">
                  {goalsData.map((goal, index) => (
                    <div key={index}>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-slate-500">{goal.name}</span>
                        <span className="font-medium text-slate-700">{goal.progress}%</span>
                      </div>
                      <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#4F46E5] rounded-full"
                          style={{ width: `${goal.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom row - Quick actions */}
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-slate-50/80 rounded-xl p-3 text-center">
                  <Calculator className="w-5 h-5 text-[#4F46E5] mx-auto mb-2" />
                  <span className="text-xs text-slate-600">Cashflow</span>
                </div>
                <div className="bg-slate-50/80 rounded-xl p-3 text-center">
                  <BarChart3 className="w-5 h-5 text-emerald-500 mx-auto mb-2" />
                  <span className="text-xs text-slate-600">Monte Carlo</span>
                </div>
                <div className="bg-slate-50/80 rounded-xl p-3 text-center">
                  <TrendingDown className="w-5 h-5 text-amber-500 mx-auto mb-2" />
                  <span className="text-xs text-slate-600">CGT Calc</span>
                </div>
                <div className="bg-slate-50/80 rounded-xl p-3 text-center">
                  <Target className="w-5 h-5 text-purple-500 mx-auto mb-2" />
                  <span className="text-xs text-slate-600">Goals</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
