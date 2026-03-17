"use client"

import { SignIn } from "@/components/SignIn"
import { PasswordSignIn } from "@/components/PasswordSignIn"
import { Github } from "lucide-react"
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
} from "recharts"
import { useSyncExternalStore } from "react"

// Deterministic pseudo-random function based on index for consistent SSR/client rendering
function starPosition(index: number) {
  const x = ((index * 17 + 7) % 100);
  const y = ((index * 23 + 13) % 100);
  const size = ((index * 3 + 2) % 15) / 10 + 0.5;
  const opacity = ((index * 5 + 3) % 70) / 100 + 0.3;
  const delay = ((index * 7 + 5) % 30) / 10;
  const duration = ((index * 11 + 7) % 20) / 10 + 2;
  return { x, y, size, opacity, delay, duration };
}

function subscribe() {
  return () => {};
}

export default function Login() {
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );

  // Sample data for charts
  const portfolioData = [
    { name: "Stocks", value: 45, color: "#6366F1" },
    { name: "Bonds", value: 30, color: "#10B981" },
    { name: "Real Estate", value: 15, color: "#F59E0B" },
    { name: "Cash", value: 10, color: "#8B5CF6" },
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
    <div className="min-h-screen w-full flex items-stretch justify-center p-4 sm:p-6 lg:p-12 relative overflow-hidden bg-[#030712]">
      {/* Animated cosmic background */}
      <div className="absolute inset-0 bg-[#030712]">
        {/* Deep space gradient base */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/40 via-[#030712] to-emerald-950/30"></div>

        {/* Animated stars - only render on client */}
        {mounted && (
          <div className="absolute inset-0">
            {[...Array(80)].map((_, i) => {
              const s = starPosition(i);
              return (
                <div
                  key={i}
                  className="absolute rounded-full bg-white animate-pulse"
                  style={{
                    left: `${s.x}%`,
                    top: `${s.y}%`,
                    width: `${s.size}px`,
                    height: `${s.size}px`,
                    opacity: s.opacity,
                    animationDelay: `${s.delay}s`,
                    animationDuration: `${s.duration}s`,
                  }}
                />
              );
            })}
          </div>
        )}

        {/* Nebula clouds */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] animate-[pulse_4s_ease-in-out_infinite]"></div>
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-emerald-600/15 rounded-full blur-[100px] animate-[pulse_5s_ease-in-out_infinite]" style={{ animationDelay: '1.5s' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-[150px]"></div>

        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.03)_1px,transparent_1px)] bg-[size:60px_60px]"></div>

        {/* Gradient overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#030712] via-transparent to-[#030712]/50"></div>
      </div>

      {/* Main content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col xl:flex-row items-center xl:items-stretch justify-center gap-6 lg:gap-12 pt-[8vh]">
        {/* Left side - Branding & Login */}
        <div className="w-full xl:w-6/12 flex flex-col justify-center h-full">
          {/* Logo */}
          <div className="flex items-center justify-center xl:justify-start gap-3 mb-6">
            <div className="relative">
              <Image src={favicon} alt="Drawdown Desk" width={48} height={48} className="rounded-xl" />
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-xl blur opacity-30"></div>
            </div>
            <span className="text-2xl lg:text-4xl font-bold text-white tracking-tight flex items-center gap-3">
              Drawdown Desk
              <a href="https://github.com/mtlh/drawdowndesk" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors">
                <Github className="w-5 h-5 lg:w-6 lg:h-6" />
              </a>
            </span>
          </div>

          {/* Hero text */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-white leading-tight mb-4 text-center xl:text-left">
            Your investments,
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-emerald-400">
              perfectly tracked
            </span>
          </h1>
          <p className="text-slate-400 text-base lg:text-lg mb-8 max-w-md mx-auto xl:mx-0 text-center xl:text-left">
            Track portfolios, simulate retirement, and plan UK taxes with powerful visualisations.
          </p>

          {/* Sign in buttons */}
          <div className="space-y-3 w-full max-w-lg mx-auto xl:mx-0 text-center xl:text-left">
            <div className="p-5 rounded-xl bg-slate-900/50 border border-white/10">
              <div className="group mb-4">
                <SignIn />
              </div>
              <p className="text-xs text-slate-400 mb-3 text-center">or sign in with email & password</p>
              <PasswordSignIn />
            </div>
          </div>
        </div>

        {/* Right side - Dashboard preview - client only due to Recharts */}
        {mounted && (
        <div className="hidden xl:block w-full xl:w-6/12 h-full">
          <div className="relative">
            {/* Glow effect behind card */}
            <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-emerald-500/20 rounded-3xl blur-2xl"></div>

            {/* Dashboard card - macOS window style */}
            <div className="relative bg-slate-900/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
              {/* macOS Window Title Bar - White */}
              <div className="bg-white/90 px-4 py-2.5 border-b border-slate-200/20 flex items-center gap-3">
                {/* macOS Traffic Light Buttons */}
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#ff5f57] shadow-sm border border-red-400/30"></div>
                  <div className="w-3 h-3 rounded-full bg-[#febc2e] shadow-sm border border-yellow-400/30"></div>
                  <div className="w-3 h-3 rounded-full bg-[#28c840] shadow-sm border border-green-400/30"></div>
                </div>
                {/* Window Title */}
                <div className="flex items-center gap-2 flex-1 justify-center">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-emerald-500 flex items-center justify-center text-white text-[7px] font-bold">
                    JD
                  </div>
                  <span className="text-xs font-medium text-slate-600">Portfolio</span>
                  <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-600 text-[9px] font-medium rounded-full flex items-center gap-1">
                    <span className="w-1 h-1 bg-emerald-500 rounded-full"></span>
                    Live
                  </span>
                </div>
              </div>

              {/* Dashboard Content */}
              <div className="p-5 space-y-4">
                {/* Main Value Display */}
                <div className="text-center py-5">
                  <div className="text-base text-slate-400 mb-1">Total Portfolio Value</div>
                  <div className="text-5xl font-bold text-white">£248,592</div>
                  <div className="text-base text-emerald-400 font-medium mt-1">+£27,431 (12.4%) this year</div>
                </div>

                {/* Performance Chart - Full Width */}
                <div className="bg-gradient-to-br from-indigo-500/10 to-emerald-500/10 rounded-lg p-3 border border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-sm font-semibold text-white">Performance</h2>
                    <div className="flex gap-1">
                      <span className="px-2 py-0.5 bg-indigo-500 text-white text-xs font-medium rounded">6M</span>
                      <span className="px-2 py-0.5 text-slate-400 text-xs">1Y</span>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={110}>
                    <AreaChart data={performanceData}>
                      <defs>
                        <linearGradient id="colorValuePreviewNew" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366F1" stopOpacity={0.5}/>
                          <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="month" stroke="#475569" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 9 }} />
                      <YAxis hide />
                      <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "none", borderRadius: "6px", fontSize: "10px", color: "#fff", padding: "6px" }} formatter={(value: number) => [`£${value.toLocaleString()}`, "Value"]} />
                      <Area type="monotone" dataKey="value" stroke="#6366F1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorValuePreviewNew)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Allocation & Top Holdings */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Allocation */}
                  <div className="bg-slate-800/40 rounded-lg p-4 border border-white/5">
                    <h2 className="text-sm font-semibold text-white mb-3">Allocation</h2>
                    <ResponsiveContainer width="100%" height={80}>
                      <PieChart>
                        <Pie data={portfolioData} dataKey="value" cx="50%" cy="50%" innerRadius={18} outerRadius={32} paddingAngle={2}>
                          {portfolioData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-1 mt-2">
                      {portfolioData.map((item, index) => (
                        <div key={index} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                            <span className="text-slate-300">{item.name}</span>
                          </div>
                          <span className="font-medium text-white">{item.value}%</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top Holdings */}
                  <div className="bg-slate-800/40 rounded-lg p-4 border border-white/5">
                    <h2 className="text-sm font-semibold text-white mb-3">Top Holdings</h2>
                    <div className="space-y-3">
                      {[{ symbol: "AAPL", value: "£48,230", change: "+2.4%", color: "#10B981" }, { symbol: "Vanguard", value: "£42,100", change: "+1.8%", color: "#10B981" }, { symbol: "MSFT", value: "£37,890", change: "-0.6%", color: "#EF4444" }].map((h, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-white text-sm">{h.symbol}</div>
                            <div className="text-xs text-slate-400">{h.value}</div>
                          </div>
                          <span className={`text-xs font-medium ${h.change.startsWith('+') ? 'text-emerald-400' : 'text-red-400'}`}>{h.change}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-800/40 rounded-lg p-3 border border-white/5 text-center">
                    <div className="text-sm text-slate-400">YTD Return</div>
                    <div className="text-xl font-bold text-emerald-400">+11.1%</div>
                  </div>
                  <div className="bg-slate-800/40 rounded-lg p-3 border border-white/5 text-center">
                    <div className="text-sm text-slate-400">Dividends</div>
                    <div className="text-xl font-bold text-white">£3,240</div>
                  </div>
                  <div className="bg-slate-800/40 rounded-lg p-3 border border-white/5 text-center">
                    <div className="text-sm text-slate-400">Goals</div>
                    <div className="text-xl font-bold text-white">2/5</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  )
}
