"use client"

import { SignIn } from "@/components/SignIn"
import { Button } from "@/components/ui/button"
import { Github, TrendingUp, Target, Wallet } from "lucide-react"
import Image from "next/image"
import favicon from "./favicon.ico"
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

export default function Login() {
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
    { month: "Jan", value: 100000 },
    { month: "Feb", value: 105000 },
    { month: "Mar", value: 103000 },
    { month: "Apr", value: 108000 },
    { month: "May", value: 112000 },
    { month: "Jun", value: 115000 },
  ]

  return (
    <div className="min-h-screen flex items-center justify-center p-6 lg:p-10 relative overflow-hidden bg-[#0f172a]">
      {/* Background with dark overlay */}
      <div className="absolute inset-0 bg-[#0f172a]">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: 'url(/hero-bg.jpg)' }}
        />
        <div className="absolute inset-0 bg-white/20" />
      </div>

      {/* Main card - improved contrast */}
      <div className="relative w-full lg:w-[90vw] xl:w-[70vw] bg-white/5 backdrop-blur-md rounded-2xl lg:rounded-3xl shadow-2xl overflow-hidden flex flex-col lg:flex-row">
        {/* Left side - Login */}
        <div className="w-full lg:w-6/12 p-6 lg:p-12 flex flex-col bg-white/5 overflow-hidden lg:min-h-[600px]">
          {/* Logo with favicon - at top */}
          <div className="flex items-center gap-3 mb-6">
            <Image src={favicon} alt="Drawdown Desk" width={36} height={36} className="rounded-xl lg:w-12 lg:h-12" />
            <span className="text-xl lg:text-3xl font-bold text-white">Drawdown Desk</span>
          </div>

          {/* Heading + Buttons - centered vertically on desktop */}
          <div className="flex-1 flex flex-col justify-center">
            <h1 className="text-2xl lg:text-5xl font-bold text-white">
              Welcome back
            </h1>
            <p className="text-slate-300 text-sm lg:text-lg mt-2 mb-6">
              Sign in to track your investments.
            </p>

            {/* Sign in buttons - limited width */}
            <div className="space-y-3 w-full max-w-sm">
            <div className="w-full">
              <div className="group">
                <SignIn />
              </div>
            </div>
            <a href="https://github.com/mtlh/drawdowndesk" target="_blank" rel="noopener noreferrer" className="block w-full">
              <Button style={{ backgroundColor: '#000000', borderColor: '#374151' }} className="w-full gap-2 h-12 text-base hover:bg-gray-800 text-white transition-all font-semibold shadow-md">
                <Github className="w-5 h-5" />
                View on GitHub
              </Button>
            </a>
          </div>
          </div>
        </div>

        {/* Right side - Dashboard preview - hidden on mobile */}
        <div className="hidden lg:flex lg:w-6/12 bg-white/5 overflow-hidden">
          {/* Dashboard preview card */}
          <div className="bg-white border-l-0 border border-white/50 shadow-lg overflow-hidden h-full w-full">
            {/* Dashboard header */}
            <div className="bg-slate-100/80 px-6 py-4 border-b border-slate-200/50 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">Portfolio Overview</span>
              <div className="flex gap-1.5" aria-hidden="true">
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
                <h2 className="text-sm font-semibold text-slate-700 mb-4">Portfolio Performance</h2>
                <ResponsiveContainer width="100%" height={120}>
                  <AreaChart data={performanceData}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" stroke="#64748b" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "12px", color: "#1e293b", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                      labelStyle={{ color: "#64748b", fontSize: "11px", marginBottom: "4px" }}
                      formatter={(value: number) => [`£${value.toLocaleString()}`, "Value"]}
                    />
                    <Area type="monotone" dataKey="value" stroke="#4F46E5" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Middle row - Allocation & Cashflow */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50/80 rounded-xl p-4">
                  <h2 className="text-sm font-semibold text-slate-700 mb-3">Asset Allocation</h2>
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
                  <h2 className="text-sm font-semibold text-slate-700 mb-3">Monthly Cashflow</h2>
                  <ResponsiveContainer width="100%" height={100}>
                    <BarChart data={cashflowData}>
                      <XAxis dataKey="month" stroke="#64748b" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                      <YAxis hide />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "11px", color: "#1e293b", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                        labelStyle={{ color: "#64748b", fontSize: "11px", marginBottom: "2px" }}
                      />
                      <Bar dataKey="value" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Goals - top goal only */}
              <div className="bg-slate-50/80 rounded-xl p-4">
                <h2 className="text-sm font-semibold text-slate-700 mb-3">Financial Goal</h2>
                {goalsData.slice(0, 1).map((goal, index) => (
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
        </div>
        </div>
      </div>
    </div>
  )
}
