"use client"

console.log('[Login Module] Script loaded')

import { useState, useEffect, useCallback, useRef } from "react"

if (typeof window !== 'undefined') {
  window.addEventListener('pageshow', (e: Event) => {
    const persisted = (e as PageTransitionEvent).persisted
    console.log('[GLOBAL] pageshow event, persisted:', persisted)
    
    // Use performance API to detect back/forward
    const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]
    if (navEntries.length > 0) {
      console.log('[GLOBAL] navigation type:', navEntries[0].type)
      if (navEntries[0].type === 'back_forward') {
        console.log('[GLOBAL] Back/forward detected - reloading')
        window.location.reload()
      }
    }
  })
}
import { useRouter } from "next/navigation"
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react"
import { 
  TrendingUp, 
  ArrowRight,
  Calculator,
  Target,
  LineChart,
  Wallet,
  X,
  ChevronRight,
  PieChart,
  Play,
  BarChart3,
  Percent
} from "lucide-react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Legend,
  Cell
} from "recharts"
import { SignIn } from "@/components/SignIn"
import { PasswordSignIn } from "@/components/PasswordSignIn"
import { PageBackground } from "@/components/page-background"
import { LiquidGlassNavbar } from "@/components/liquid-glass-navbar"
import { Logo } from "@/components/Logo"

function AuthModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md animate-scale-in">
        <div className="absolute -top-2 -left-2 w-6 h-6 border-l-2 border-t-2 border-[#C9A962]/40" />
        <div className="absolute -bottom-2 -right-2 w-6 h-6 border-r-2 border-b-2 border-[#C9A962]/40" />
        <div className="p-8 rounded-2xl bg-[#0F4D38] border border-[#C9A962]/20 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-[family-name:var(--font-display)] text-2xl text-[#FDF8F3]">Welcome Back</h2>
            <button onClick={onClose} className="text-[#FDF8F3]/50 hover:text-[#FDF8F3]">
              <X className="w-6 h-6" />
            </button>
          </div>
          <SignIn />
          <div className="relative flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#C9A962]/30 to-transparent" />
            <span className="font-[family-name:var(--font-body)] text-xs text-[#FDF8F3]/50">or</span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#C9A962]/30 to-transparent" />
          </div>
          <PasswordSignIn />
        </div>
      </div>
    </div>
  )
}

function HeroSection({ onOpenAuth }: { onOpenAuth: () => void }) {
  console.log('[HeroSection] Render - isVisible:', false)
  const [isVisible, setIsVisible] = useState(false)
  const router = useRouter()
  
  console.log('[HeroSection] After useState - isVisible:', false)
  
  useEffect(() => {
    console.log('[HeroSection] useEffect running - setting isVisible to true')
    setIsVisible(true)
    return () => console.log('[HeroSection] useEffect cleanup')
  }, [])
  
  // Add document-level listener for pageshow
  useEffect(() => {
    const handler = () => console.log('[HeroSection] Document pageshow fired')
    document.addEventListener('pageshow', handler)
    return () => document.removeEventListener('pageshow', handler)
  }, [])

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <PageBackground variant="hero" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16">
        <div className="text-center max-w-4xl mx-auto">
          <h1 
            className={`font-[family-name:var(--font-display)] text-6xl sm:text-7xl lg:text-[6.5rem] font-bold text-[#FDF8F3] leading-[0.9] mb-6 transition-all duration-1000 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-16'}`}
            style={{ transitionDelay: '50ms' }}
          >
            <span className="block">Navigate Your</span>
            <span className="relative inline-block mt-2">
              <span className="relative z-10 bg-gradient-to-r from-[#E8D089] via-[#C9A962] to-[#C9A962] bg-clip-text text-transparent">Financial Future</span>
              <svg className="absolute -bottom-4 left-0 w-full h-4 overflow-visible" viewBox="0 0 400 20" preserveAspectRatio="none">
                <path 
                  d="M0 15 Q100 5, 200 13 T400 10" 
                  stroke="url(#heroUnderline)" 
                  strokeWidth="4" 
                  fill="none" 
                  strokeLinecap="round"
                  className={`${isVisible ? 'stroke-dashoffset-[0]' : 'stroke-dashoffset-[400]'}`}
                  style={{
                    strokeDasharray: 400,
                    strokeDashoffset: isVisible ? 0 : 400,
                    transition: 'stroke-dashoffset 1.5s ease-out',
                    transitionDelay: '600ms'
                  }}
                />
                <defs>
                  <linearGradient id="heroUnderline" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#E8D089" stopOpacity="0.8" />
                    <stop offset="50%" stopColor="#C9A962" />
                    <stop offset="100%" stopColor="#A68B4B" stopOpacity="0.8" />
                  </linearGradient>
                </defs>
              </svg>
            </span>
          </h1>

          <p 
            className={`font-[family-name:var(--font-body)] text-xl sm:text-2xl text-[#FDF8F3]/60 max-w-2xl mx-auto mb-14 leading-relaxed transition-all duration-1000 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
            style={{ transitionDelay: '150ms' }}
          >
            Portfolio analytics, retirement simulations, and UK tax optimisation 
            for investors who mean business.
          </p>

          <div 
            className={`flex flex-col sm:flex-row items-center justify-center gap-5 mb-16 transition-all duration-1000 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
            style={{ transitionDelay: '250ms' }}
          >
            <AuthLoading>
              <button 
                disabled
                className="group relative px-10 py-5 rounded-full font-[family-name:var(--font-body)] font-semibold text-lg transition-all duration-300 opacity-50 cursor-not-allowed"
                style={{
                  background: 'linear-gradient(135deg, #C9A962 0%, #D4B76A 50%, #E8D089 100%)',
                  boxShadow: '0 4px 20px rgba(201, 169, 98, 0.3), 0 0 0 1px rgba(232, 208, 137, 0.1)',
                  color: '#0B3D2C'
                }}
              >
                <span className="flex items-center gap-3">
                  <ArrowRight className="w-5 h-5" />
                </span>
              </button>
            </AuthLoading>
            <Authenticated>
              <button 
                onClick={() => window.location.href = "/holdings"}
                className="group relative px-10 py-5 rounded-full font-[family-name:var(--font-body)] font-semibold text-lg transition-all duration-300 hover:scale-[1.03] active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, #C9A962 0%, #D4B76A 50%, #E8D089 100%)',
                  boxShadow: '0 4px 20px rgba(201, 169, 98, 0.3), 0 0 0 1px rgba(232, 208, 137, 0.1)',
                  color: '#0B3D2C'
                }}
              >
                <span className="flex items-center gap-3">
                  View Holdings
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
                </span>
              </button>
            </Authenticated>
            <Unauthenticated>
              <button 
                onClick={onOpenAuth} 
                className="group relative px-10 py-5 rounded-full font-[family-name:var(--font-body)] font-semibold text-lg transition-all duration-300 hover:scale-[1.03] active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, #C9A962 0%, #D4B76A 50%, #E8D089 100%)',
                  boxShadow: '0 4px 20px rgba(201, 169, 98, 0.3), 0 0 0 1px rgba(232, 208, 137, 0.1)',
                  color: '#0B3D2C'
                }}
              >
                <span className="flex items-center gap-3">
                  Get Started
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
                </span>
              </button>
            </Unauthenticated>
            <a 
              href="#demo" 
              className="group flex items-center gap-2 px-6 py-3 text-[#FDF8F3]/70 font-[family-name:var(--font-body)] font-medium text-base transition-all duration-300 hover:text-[#C9A962] hover:bg-[#C9A962]/5 rounded-full"
            >
              <span className="relative flex items-center justify-center w-8 h-8 rounded-full border border-[#FDF8F3]/20 group-hover:border-[#C9A962]/40 transition-colors">
                <BarChart3 className="w-4 h-4" />
              </span>
              Try Demo
            </a>
          </div>

          <div 
            className={`flex items-center justify-center gap-12 sm:gap-16 transition-all duration-1000 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
            style={{ transitionDelay: '350ms' }}
          >
            {[
              { value: "Real-time", label: "Sync" },
              { value: "UK", label: "Compliant" },
              { value: "Auto", label: "Updates" }
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <p className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-bold text-[#FDF8F3]">{stat.value}</p>
                <p className="font-[family-name:var(--font-body)] text-sm text-[#FDF8F3]/40 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function FeaturesSection() {
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )
    
    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }
    
    return () => observer.disconnect()
  }, [])

  const features = [
    { icon: PieChart, title: "Portfolio Tracking", desc: "Unified view of all investments with real-time updates and performance analytics.", accent: "#C9A962" },
    { icon: Calculator, title: "Tax Calculations", desc: "Automated CGT, dividend tax, and ISA allowance calculations.", accent: "#4ADE80" },
    { icon: BarChart3, title: "Monte Carlo Sims", desc: "Probability-based retirement projections you can trust.", accent: "#60A5FA" },
    { icon: Target, title: "Goal Tracking", desc: "Set milestones and track progress toward financial freedom.", accent: "#F472B6" },
    { icon: Wallet, title: "Withdrawal Planner", desc: "Tax-efficient drawdown strategies for your retirement.", accent: "#A78BFA" },
    { icon: TrendingUp, title: "Performance", desc: "Detailed metrics, benchmarking, and historical analysis.", accent: "#22D3EE" },
  ]

  return (
    <section id="features" ref={sectionRef} className="relative py-32 overflow-hidden">
      <PageBackground variant="section" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center mb-20 transition-all duration-1000 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
          <p className="font-[family-name:var(--font-body)] text-sm uppercase tracking-[0.25em] text-[#C9A962]/60 mb-6">Capabilities</p>
          <h2 className="font-[family-name:var(--font-display)] text-5xl sm:text-6xl font-bold text-[#FDF8F3] mb-6">
            Everything You Need
          </h2>
          <p className="font-[family-name:var(--font-body)] text-xl text-[#FDF8F3]/50 max-w-2xl mx-auto">
            Powerful tools designed for UK investors to manage, analyze, and optimize portfolios.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-16">
          {features.map((feature, i) => (
            <div 
              key={i} 
              className={`group transition-all duration-700 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{ transitionDelay: `${100 + i * 80}ms` }}
            >
              <div className="flex items-start gap-5">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110"
                  style={{ backgroundColor: `${feature.accent}12` }}
                >
                  <feature.icon className="w-6 h-6" style={{ color: feature.accent }} />
                </div>
                <div>
                  <h3 className="font-[family-name:var(--font-display)] text-xl text-[#FDF8F3] font-semibold mb-2 group-hover:text-[#C9A962] transition-colors duration-300">{feature.title}</h3>
                  <p className="font-[family-name:var(--font-body)] text-[#FDF8F3]/50 leading-relaxed">{feature.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function CalculatorSection() {
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )
    
    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }
    
    return () => observer.disconnect()
  }, [])

  const taxData = [
    { band: "Personal Allowance", rate: "0%", amount: "£0 - £12,570", color: "#4ADE80" },
    { band: "Basic Rate", rate: "20%", amount: "£12,571 - £50,270", color: "#C9A962" },
    { band: "Higher Rate", rate: "40%", amount: "£50,271 - £125,140", color: "#F59E0B" },
    { band: "Additional Rate", rate: "45%", amount: "Over £125,140", color: "#EF4444" },
  ]

  return (
    <section id="calculators" ref={sectionRef} className="relative py-32 overflow-hidden">
      <PageBackground variant="section" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className={`transition-all duration-1000 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-12'}`}>
            <p className="font-[family-name:var(--font-body)] text-sm uppercase tracking-[0.3em] text-[#C9A962]/70 mb-4">Tax Intelligence</p>
            <h2 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl font-bold text-[#FDF8F3] mb-8 leading-tight">
              UK Tax computations,<br />
              <span className="text-[#C9A962]">simplified</span>
            </h2>
            <p className="font-[family-name:var(--font-body)] text-lg text-[#FDF8F3]/60 mb-10 leading-relaxed">
              Automatically calculate Capital Gains Tax, dividend tax, and understand your tax bands. 
              Our tools stay current with the latest UK tax regulations.
            </p>
            
            <div className="space-y-4">
              {["Automatic CGT calculations", "Dividend allowance tracking", "ISA & pension optimisation", "Tax loss harvesting suggestions"].map((item, i) => (
                <div 
                  key={i} 
                  className={`flex items-center gap-4 transition-all duration-500 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}
                  style={{ transitionDelay: `${200 + i * 100}ms` }}
                >
                  <div className="w-6 h-6 rounded-full bg-[#C9A962]/20 flex items-center justify-center flex-shrink-0">
                    <ChevronRight className="w-3 h-3 text-[#C9A962]" />
                  </div>
                  <span className="font-[family-name:var(--font-body)] text-[#FDF8F3]/80">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div 
            className={`relative transition-all duration-1000 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'}`}
            style={{ transitionDelay: '300ms' }}
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-xl bg-[#C9A962]/15 flex items-center justify-center">
                <Percent className="w-6 h-6 text-[#C9A962]" />
              </div>
              <div>
                <h3 className="font-[family-name:var(--font-display)] text-xl text-[#FDF8F3] font-semibold">Income Tax Bands</h3>
                <p className="font-[family-name:var(--font-body)] text-sm text-[#FDF8F3]/50">Tax Year 2024/25</p>
              </div>
            </div>
            
            <div className="space-y-4">
              {taxData.map((tax, i) => (
                <div 
                  key={i} 
                  className={`flex items-center justify-between py-4 transition-all duration-500 group ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}
                  style={{ transitionDelay: `${400 + i * 80}ms` }}
                >
                  <div className="flex items-center gap-5">
                    <div 
                      className="w-4 h-4 rounded-full transition-transform group-hover:scale-125"
                      style={{ backgroundColor: tax.color }}
                    />
                    <div>
                      <p className="font-[family-name:var(--font-body)] text-base text-[#FDF8F3] font-medium">{tax.band}</p>
                      <p className="font-[family-name:var(--font-body)] text-sm text-[#FDF8F3]/40">{tax.amount}</p>
                    </div>
                  </div>
                  <span 
                    className="font-[family-name:var(--font-display)] text-2xl font-bold"
                    style={{ color: tax.color }}
                  >
                    {tax.rate}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function DemoSection() {
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef<HTMLDivElement>(null)
  const [activeTab, setActiveTab] = useState<'growth' | 'allocation'>('growth')
  const [portfolioValue, setPortfolioValue] = useState(250000)
  const [monthlyContribution, setMonthlyContribution] = useState(500)
  const [expectedReturn, setExpectedReturn] = useState(7)
  
  const generateChartData = useCallback(() => {
    const years = 10
    const data = []
    let value = portfolioValue
    
    for (let i = 0; i <= years; i++) {
      const conservative = Math.round(value * Math.pow(1.04, i) + monthlyContribution * 12 * i)
      const moderate = Math.round(value * Math.pow(1 + expectedReturn / 100, i) + monthlyContribution * 12 * i)
      const aggressive = Math.round(value * Math.pow(1.10, i) + monthlyContribution * 12 * i)
      
      data.push({
        year: `Year ${i}`,
        conservative,
        moderate,
        aggressive
      })
    }
    return data
  }, [portfolioValue, monthlyContribution, expectedReturn])

  const allocationData = [
    { name: "UK Equities", value: 35, color: "#C9A962" },
    { name: "US Equities", value: 30, color: "#4ADE80" },
    { name: "Bonds", value: 20, color: "#60A5FA" },
    { name: "Cash", value: 10, color: "#F472B6" },
    { name: "Alternatives", value: 5, color: "#A78BFA" },
  ]

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-3 rounded-lg bg-[#0B3D2C] border border-[#C9A962]/30 shadow-xl">
          <p className="font-[family-name:var(--font-display)] text-sm text-[#FDF8F3] mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="font-[family-name:var(--font-body)] text-xs" style={{ color: entry.color }}>
              {entry.name}: £{entry.value.toLocaleString()}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )
    
    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }
    
    return () => observer.disconnect()
  }, [])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(value)
  }

  const chartData = generateChartData()
  const finalValue = chartData[chartData.length - 1].moderate

  return (
    <section id="demo" ref={sectionRef} className="relative py-32 overflow-hidden">
      <PageBackground variant="section" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center mb-16 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <p className="font-[family-name:var(--font-body)] text-sm uppercase tracking-[0.3em] text-[#C9A962]/70 mb-4">Interactive Demo</p>
          <h2 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl font-bold text-[#FDF8F3] mb-6">
            See Your <span className="text-[#C9A962]">Future</span>
          </h2>
          <p className="font-[family-name:var(--font-body)] text-lg text-[#FDF8F3]/50 max-w-2xl mx-auto">
            Explore projections with our Monte Carlo simulation. Adjust parameters to see how different strategies affect your outcomes.
          </p>
        </div>

        <div className={`grid lg:grid-cols-3 gap-8 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '200ms' }}>
          <div className="lg:col-span-1 space-y-6">
            <div className="p-6 rounded-2xl bg-[#FDF8F3]/[0.03] border border-[#C9A962]/10">
              <h3 className="font-[family-name:var(--font-display)] text-lg text-[#FDF8F3] font-semibold mb-6">Simulation Parameters</h3>
              
              <div className="space-y-6">
                <div>
                  <label className="font-[family-name:var(--font-body)] text-sm text-[#FDF8F3]/70 mb-2 block">
                    Current Portfolio Value
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-[#C9A962] font-[family-name:var(--font-display)] text-lg">£</span>
                    <input
                      type="range"
                      min="50000"
                      max="1000000"
                      step="10000"
                      value={portfolioValue}
                      onChange={(e) => setPortfolioValue(Number(e.target.value))}
                      className="flex-1 h-2 bg-[#C9A962]/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#C9A962]"
                    />
                  </div>
                  <p className="font-[family-name:var(--font-display)] text-2xl text-[#FDF8F3] mt-2">
                    {formatCurrency(portfolioValue)}
                  </p>
                </div>

                <div>
                  <label className="font-[family-name:var(--font-body)] text-sm text-[#FDF8F3]/70 mb-2 block">
                    Monthly Contribution
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-[#C9A962] font-[family-name:var(--font-display)] text-lg">£</span>
                    <input
                      type="range"
                      min="0"
                      max="5000"
                      step="100"
                      value={monthlyContribution}
                      onChange={(e) => setMonthlyContribution(Number(e.target.value))}
                      className="flex-1 h-2 bg-[#C9A962]/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#C9A962]"
                    />
                  </div>
                  <p className="font-[family-name:var(--font-display)] text-2xl text-[#FDF8F3] mt-2">
                    {formatCurrency(monthlyContribution)}/mo
                  </p>
                </div>

                <div>
                  <label className="font-[family-name:var(--font-body)] text-sm text-[#FDF8F3]/70 mb-2 block">
                    Expected Annual Return
                  </label>
                  <input
                    type="range"
                    min="2"
                    max="15"
                    step="0.5"
                    value={expectedReturn}
                    onChange={(e) => setExpectedReturn(Number(e.target.value))}
                    className="w-full h-2 bg-[#C9A962]/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#C9A962]"
                  />
                  <p className="font-[family-name:var(--font-display)] text-2xl text-[#FDF8F3] mt-2">
                    {expectedReturn}%
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-gradient-to-br from-[#C9A962]/20 to-[#C9A962]/5 border border-[#C9A962]/30">
              <p className="font-[family-name:var(--font-body)] text-sm text-[#FDF8F3]/60 mb-1">10-Year Projection</p>
              <p className="font-[family-name:var(--font-display)] text-4xl font-bold text-[#C9A962]">
                {formatCurrency(finalValue)}
              </p>
              <p className="font-[family-name:var(--font-body)] text-sm text-[#FDF8F3]/50 mt-2">
                Based on {expectedReturn}% annual return
              </p>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="p-6 rounded-2xl bg-[#FDF8F3]/[0.03] border border-[#C9A962]/10">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-[family-name:var(--font-display)] text-xl text-[#FDF8F3] font-semibold">Growth Projection</h3>
                  <p className="font-[family-name:var(--font-body)] text-sm text-[#FDF8F3]/50">Monte Carlo Simulation Results</p>
                </div>
                <div className="flex gap-2">
                  {(['growth', 'allocation'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-4 py-2 rounded-lg font-[family-name:var(--font-body)] text-sm transition-all ${activeTab === tab ? 'bg-[#C9A962] text-[#0B3D2C]' : 'bg-[#FDF8F3]/5 text-[#FDF8F3]/60 hover:bg-[#FDF8F3]/10'}`}
                    >
                      {tab === 'growth' ? 'Growth' : 'Allocation'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-[350px]">
                {activeTab === 'growth' ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData}>
                      <defs>
                        <linearGradient id="colorConservative" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4ADE80" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#4ADE80" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorModerate" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#C9A962" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#C9A962" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorAggressive" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#60A5FA" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#60A5FA" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="year" stroke="rgba(253,248,243,0.2)" tickLine={false} axisLine={false} tick={{ fill: 'rgba(253,248,243,0.5)', fontSize: 11 }} />
                      <YAxis stroke="rgba(253,248,243,0.2)" tickLine={false} axisLine={false} tick={{ fill: 'rgba(253,248,243,0.5)', fontSize: 11 }} tickFormatter={(value) => `£${(value/1000)}k`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend 
                        wrapperStyle={{ paddingTop: '20px' }}
                        formatter={(value) => <span style={{ color: 'rgba(253,248,243,0.7)', fontSize: '12px' }}>{value}</span>}
                      />
                      <Area type="monotone" dataKey="conservative" name="Conservative (4%)" stroke="#4ADE80" strokeWidth={2} fillOpacity={1} fill="url(#colorConservative)" />
                      <Area type="monotone" dataKey="moderate" name="Moderate" stroke="#C9A962" strokeWidth={2} fillOpacity={1} fill="url(#colorModerate)" />
                      <Area type="monotone" dataKey="aggressive" name="Aggressive (10%)" stroke="#60A5FA" strokeWidth={2} fillOpacity={1} fill="url(#colorAggressive)" />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={allocationData} layout="vertical">
                      <XAxis type="number" stroke="rgba(253,248,243,0.2)" tickLine={false} axisLine={false} tick={{ fill: 'rgba(253,248,243,0.5)', fontSize: 11 }} tickFormatter={(value) => `${value}%`} />
                      <YAxis dataKey="name" type="category" stroke="rgba(253,248,243,0.2)" tickLine={false} axisLine={false} tick={{ fill: 'rgba(253,248,243,0.7)', fontSize: 11 }} width={100} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" name="Allocation" radius={[0, 4, 4, 0]}>
                        {allocationData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="flex items-center justify-center gap-6 mt-6 pt-6 border-t border-[#C9A962]/10">
                {[
                  { label: "Conservative", color: "#4ADE80" },
                  { label: "Moderate", color: "#C9A962" },
                  { label: "Aggressive", color: "#60A5FA" }
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="font-[family-name:var(--font-body)] text-sm text-[#FDF8F3]/60">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function CTA({ onOpenAuth }: { onOpenAuth: () => void }) {
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )
    
    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }
    
    return () => observer.disconnect()
  }, [])

  return (
    <section ref={sectionRef} className="relative py-40 overflow-hidden">
      <PageBackground variant="section" />
      
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className={`transition-all duration-1000 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
          <p className="font-[family-name:var(--font-body)] text-sm uppercase tracking-[0.25em] text-[#C9A962]/60 mb-8">Start Today</p>
          <h2 className="font-[family-name:var(--font-display)] text-5xl sm:text-6xl font-bold text-[#FDF8F3] mb-8">
            Ready to Take Control?
          </h2>
          <p className="font-[family-name:var(--font-body)] text-xl text-[#FDF8F3]/50 max-w-2xl mx-auto mb-12 leading-relaxed">
            Join thousands of UK investors planning their financial future with confidence.
          </p>
          <button 
            onClick={onOpenAuth}
            className="group relative px-12 py-5 rounded-full font-[family-name:var(--font-body)] font-semibold text-lg transition-all duration-300 hover:scale-[1.03] active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #C9A962 0%, #D4B76A 50%, #E8D089 100%)',
              boxShadow: '0 4px 24px rgba(201, 169, 98, 0.3), 0 0 0 1px rgba(232, 208, 137, 0.1)',
              color: '#0B3D2C'
            }}
          >
            <span className="flex items-center gap-3">
              Get Started Free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
            </span>
          </button>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="relative py-16 overflow-hidden border-t border-[#C9A962]/10">
      <PageBackground variant="section" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <Logo size="md" />
            <div>
              <p className="font-[family-name:var(--font-display)] text-xl font-semibold text-[#FDF8F3]">Drawdown Desk</p>
              <p className="font-[family-name:var(--font-body)] text-sm text-[#FDF8F3]/40">Financial clarity for UK investors</p>
            </div>
          </div>
          <p className="font-[family-name:var(--font-body)] text-sm text-[#FDF8F3]/30">
            ©{new Date().getFullYear()} Drawdown Desk. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}

export default function Login() {
  console.log('[Login] Render - isAuthOpen:', false, 'renderKey:', 0)
  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const [renderKey, setRenderKey] = useState(0)

  console.log('[Login] After useState - isAuthOpen:', false, 'renderKey:', renderKey)

  useEffect(() => {
    console.log('[Login] useEffect mounted')
    
    const handlepageshow = (event: PageTransitionEvent) => {
      console.log('[Login] Pageshow event - persisted:', event.persisted)
      console.log('[Login] Pageshow - setting renderKey to', renderKey + 1)
      setRenderKey(k => k + 1)
    }
    
    window.addEventListener('pageshow', handlepageshow)
    console.log('[Login] Added pageshow listener')
    return () => {
      console.log('[Login] useEffect cleanup')
      window.removeEventListener('pageshow', handlepageshow)
    }
  }, [])

  console.log('[Login] Before render, renderKey:', renderKey)

  return (
    <div key={renderKey} className="relative min-h-screen">
      <LiquidGlassNavbar onOpenAuth={() => setIsAuthOpen(true)} />
      <main className="relative">
        <HeroSection onOpenAuth={() => setIsAuthOpen(true)} />
        <FeaturesSection />
        <CalculatorSection />
        <DemoSection />
        <CTA onOpenAuth={() => setIsAuthOpen(true)} />
      </main>
      <Footer />
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </div>
  )
}