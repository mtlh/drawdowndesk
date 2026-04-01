"use client"

import { useState, useEffect } from "react"
import { Menu, X, Github, ArrowRight } from "lucide-react"
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react"
import { Logo } from "./Logo"
import { useRouter } from "next/navigation"

interface LiquidGlassNavbarProps {
  onOpenAuth: () => void
}

export function LiquidGlassNavbar({ onOpenAuth }: LiquidGlassNavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <>
      <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-4xl">
        <div 
          className="relative rounded-2xl transition-all duration-500"
          style={{
            background: isScrolled 
              ? 'rgba(11, 61, 44, 0.35)'
              : 'rgba(11, 61, 44, 0.08)',
            backdropFilter: 'blur(20px) saturate(150%)',
            WebkitBackdropFilter: 'blur(20px) saturate(150%)',
            boxShadow: isScrolled
              ? '0 8px 24px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
              : '0 2px 12px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.02)'
          }}
        >
          <div 
            className="absolute inset-0 rounded-2xl pointer-events-none overflow-hidden opacity-50"
            style={{
              background: 'linear-gradient(135deg, rgba(201, 169, 98, 0.05) 0%, transparent 50%, rgba(74, 222, 128, 0.03) 100%)'
            }}
          />
          
          <div 
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{
              boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.1), inset 0 -1px 0 rgba(0, 0, 0, 0.1)'
            }}
          />

          <div className="relative px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Logo />
                <span className="font-[family-name:var(--font-display)] text-lg font-semibold text-[#FDF8F3]">
                  Drawdown Desk
                </span>
              </div>

              <div className="hidden md:flex items-center gap-1">
                <a 
                  href="#features" 
                  className="font-[family-name:var(--font-body)] text-sm text-[#FDF8F3]/70 hover:text-[#C9A962] transition-colors px-4 py-2 rounded-lg hover:bg-[#C9A962]/10"
                >
                  Features
                </a>
                <a 
                  href="#calculators" 
                  className="font-[family-name:var(--font-body)] text-sm text-[#FDF8F3]/70 hover:text-[#C9A962] transition-colors px-4 py-2 rounded-lg hover:bg-[#C9A962]/10"
                >
                  Calculators
                </a>
                <a 
                  href="#demo" 
                  className="font-[family-name:var(--font-body)] text-sm text-[#FDF8F3]/70 hover:text-[#C9A962] transition-colors px-4 py-2 rounded-lg hover:bg-[#C9A962]/10"
                >
                  Demo
                </a>
              </div>

              <div className="hidden md:flex items-center gap-2">
                <a 
                  href="https://github.com/mtlh/drawdowndesk" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="p-2.5 rounded-lg text-[#FDF8F3]/50 hover:text-[#C9A962] hover:bg-[#C9A962]/10 transition-all duration-300"
                >
                  <Github className="w-4 h-4" />
                </a>
                <AuthLoading>
                  <button 
                    disabled
                    className="group relative px-6 py-2.5 rounded-full font-[family-name:var(--font-body)] text-sm font-semibold transition-all duration-300 opacity-50 cursor-not-allowed"
                    style={{
                      background: 'linear-gradient(135deg, #C9A962 0%, #D4B76A 50%, #E8D089 100%)',
                      color: '#0B3D2C',
                      boxShadow: '0 2px 16px rgba(201, 169, 98, 0.25)'
                    }}
                  >
                    <span className="flex items-center gap-2">
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </button>
                </AuthLoading>
                  <Authenticated>
                    <button 
                    onClick={() => router.push("/holdings")}
                    className="group relative px-6 py-2.5 rounded-full font-[family-name:var(--font-body)] text-sm font-semibold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                    style={{
                      background: 'linear-gradient(135deg, #C9A962 0%, #D4B76A 50%, #E8D089 100%)',
                      color: '#0B3D2C',
                      boxShadow: '0 2px 16px rgba(201, 169, 98, 0.25)'
                    }}
                  >
                    <span className="flex items-center gap-2">
                      View Holdings
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </button>
                </Authenticated>
                <Unauthenticated>
                  <button 
                    onClick={onOpenAuth} 
                    className="group relative px-6 py-2.5 rounded-full font-[family-name:var(--font-body)] text-sm font-semibold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                    style={{
                      background: 'linear-gradient(135deg, #C9A962 0%, #D4B76A 50%, #E8D089 100%)',
                      color: '#0B3D2C',
                      boxShadow: '0 2px 16px rgba(201, 169, 98, 0.25)'
                    }}
                  >
                    <span className="flex items-center gap-2">
                      Get Started
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </button>
                </Unauthenticated>
              </div>

              <button 
                className="md:hidden text-[#FDF8F3] p-2 rounded-lg hover:bg-[#C9A962]/10 transition-colors" 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>

            {isMenuOpen && (
              <div className="md:hidden pt-4 mt-4 border-t border-[#C9A962]/10">
                <div className="flex flex-col gap-1">
                  <a href="#features" className="font-[family-name:var(--font-body)] text-sm text-[#FDF8F3]/70 hover:text-[#C9A962] hover:bg-[#C9A962]/10 transition-colors px-4 py-2.5 rounded-lg">
                    Features
                  </a>
                  <a href="#calculators" className="font-[family-name:var(--font-body)] text-sm text-[#FDF8F3]/70 hover:text-[#C9A962] hover:bg-[#C9A962]/10 transition-colors px-4 py-2.5 rounded-lg">
                    Calculators
                  </a>
                  <a href="#demo" className="font-[family-name:var(--font-body)] text-sm text-[#FDF8F3]/70 hover:text-[#C9A962] hover:bg-[#C9A962]/10 transition-colors px-4 py-2.5 rounded-lg">
                    Demo
                  </a>
                  <AuthLoading>
                    <button 
                      disabled
                      className="mt-3 px-6 py-3 rounded-full font-[family-name:var(--font-body)] text-sm font-semibold opacity-50 cursor-not-allowed"
                      style={{
                        background: 'linear-gradient(135deg, #C9A962 0%, #D4B76A 50%, #E8D089 100%)',
                        color: '#0B3D2C'
                      }}
                    >
                      <span className="flex items-center justify-center gap-2">
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    </button>
                  </AuthLoading>
                  <Authenticated>
                    <button 
                      onClick={() => router.push("/holdings")}
                      className="mt-3 px-6 py-3 rounded-full font-[family-name:var(--font-body)] text-sm font-semibold"
                      style={{
                        background: 'linear-gradient(135deg, #C9A962 0%, #D4B76A 50%, #E8D089 100%)',
                        color: '#0B3D2C'
                      }}
                    >
                      <span className="flex items-center justify-center gap-2">
                        View Holdings
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    </button>
                  </Authenticated>
                  <Unauthenticated>
                    <button 
                      onClick={onOpenAuth} 
                      className="mt-3 px-6 py-3 rounded-full font-[family-name:var(--font-body)] text-sm font-semibold"
                      style={{
                        background: 'linear-gradient(135deg, #C9A962 0%, #D4B76A 50%, #E8D089 100%)',
                        color: '#0B3D2C'
                      }}
                    >
                      <span className="flex items-center justify-center gap-2">
                        Get Started
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    </button>
                  </Unauthenticated>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>
    </>
  )
}