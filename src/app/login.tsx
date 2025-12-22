"use client"

import { SignIn } from "@/components/SignIn"
import { Button } from "@/components/ui/button"
import { Github } from "lucide-react"
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
  BarChart,
  Bar,
} from "recharts"

export default function SignInPage() {
  // Sample data for charts
  const portfolioData = [
    { name: "Stocks", value: 45, color: "#3b82f6" },
    { name: "Bonds", value: 30, color: "#8b5cf6" },
    { name: "Real Estate", value: 15, color: "#10b981" },
    { name: "Cash", value: 10, color: "#f59e0b" },
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
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#181717]">
      {/* Left side - Marketing content */}
      <div className="lg:w-1/2 p-8 lg:p-16 flex flex-col justify-between text-white">
        <div>
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 bg-white text-[#454538] flex items-center justify-center rounded font-bold text-xl">
              DD
            </div>
            <span className="text-2xl font-bold">Drawdown Desk</span>
          </div>

          <h1 className="text-5xl lg:text-6xl font-bold mb-6 leading-tight">
            The financial platform that keeps your wealth in sync
          </h1>

          <div className="space-y-8 mt-16">
            <div>
              <h2 className="text-2xl font-semibold mb-3">Everything is analyzed</h2>
              <p className="text-white/80 leading-relaxed">
                From Monte Carlo simulations to cashflow forecasting, from retirement planning to goal tracking, analyze
                every part of your financial future with advanced modeling and exceptional accuracy.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-3">Always up to date</h2>
              <p className="text-white/80 leading-relaxed">
                Real-time calculations and automatic updates ensure your financial projections stay current with your
                latest data and market conditions.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-3">Professional insights</h2>
              <p className="text-white/80 leading-relaxed">
                Make informed decisions with institutional-grade analytics and visualization tools designed for serious
                financial planning.
              </p>
            </div>
          </div>
        </div>
        <div className="flex p-2 gap-6">
            <a href="https://github.com/mtlh/drawdowndesk"
                target="blank">
                <Button
                    className="w-fit mt-12 bg-black text-[#ffffff] px-8 py-6 text-lg rounded-full hover:cursor-pointer border-2 border-white"
                    size="lg"
                >
                    <Github className="mr-2 w-full h-full" />
                    Github
                </Button>
            </a>
            <SignIn />
        </div>
      </div>

      {/* Right side - Interactive dashboard preview */}
      <div className="lg:w-1/2 p-4 lg:p-8 flex items-center justify-center">
        <div className="w-full max-w-3xl bg-[#e8b4a0]/10 rounded-3xl p-4 border-4 border-[#e8b4a0]">
          <div className="bg-[#2d2d28] rounded-2xl overflow-hidden">
            {/* Top dashboard */}
            <div className="bg-[#1a1a16] px-6 py-4 border-b border-white/10">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-semibold">Portfolio Overview</h3>
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Portfolio Allocation Chart */}
              <div className="bg-[#1a1a16] rounded-lg p-4 border border-white/10">
                <h4 className="text-white text-sm font-semibold mb-4">Asset Allocation</h4>
                <div className="flex items-center gap-6">
                  <ResponsiveContainer className="w-full h-full" width={180} height={180}>
                    <PieChart>
                      <Pie data={portfolioData} dataKey="value" cx="50%" cy="50%" outerRadius={70}>
                        {portfolioData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2">
                    {portfolioData.map((item, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                        <span className="text-white/70 text-sm">{item.name}</span>
                        <span className="text-white font-semibold text-sm ml-auto">{item.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Cashflow Trend */}
              <div className="bg-[#1a1a16] rounded-lg p-4 border border-white/10">
                <h4 className="text-white text-sm font-semibold mb-4">Monthly Cashflow</h4>
                <ResponsiveContainer width="100%" height={150}>
                  <LineChart data={cashflowData}>
                    <XAxis dataKey="month" stroke="#ffffff40" style={{ fontSize: "12px" }} />
                    <YAxis stroke="#ffffff40" style={{ fontSize: "12px" }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#1a1a16", border: "1px solid #ffffff20", borderRadius: "8px" }}
                      labelStyle={{ color: "#fff" }}
                    />
                    <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={{ fill: "#3b82f6" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Goals Progress */}
              <div className="bg-[#1a1a16] rounded-lg p-4 border border-white/10">
                <h4 className="text-white text-sm font-semibold mb-4">Financial Goals</h4>
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={goalsData} layout="vertical">
                    <XAxis type="number" domain={[0, 100]} stroke="#ffffff40" style={{ fontSize: "12px" }} />
                    <YAxis type="category" dataKey="name" stroke="#ffffff40" style={{ fontSize: "12px" }} width={120} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#1a1a16", border: "1px solid #ffffff20", borderRadius: "8px" }}
                      labelStyle={{ color: "#fff" }}
                    />
                    <Bar dataKey="progress" fill="#10b981" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
