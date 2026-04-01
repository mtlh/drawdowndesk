"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { PageBackground } from "@/components/page-background"
import { Logo } from "@/components/Logo"

export default function NotFound() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <PageBackground variant="hero" />
      <div className="relative z-10 w-full max-w-md">
        <div className="absolute -top-2 -left-2 w-6 h-6 border-l-2 border-t-2 border-[#C9A962]/40" />
        <div className="absolute -bottom-2 -right-2 w-6 h-6 border-r-2 border-b-2 border-[#C9A962]/40" />
        <div className="p-12 rounded-2xl bg-[#0F4D38] border border-[#C9A962]/20 shadow-2xl">
          <div className="flex items-center justify-center mb-6">
            <Logo size="lg" />
          </div>
          <h1 
            className={`font-[family-name:var(--font-display)] text-8xl font-bold text-[#FDF8F3] text-center mb-2 transition-all duration-1000 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            404
          </h1>
          <h2 
            className={`font-[family-name:var(--font-display)] text-2xl text-[#FDF8F3] text-center mb-4 transition-all duration-1000 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
            style={{ transitionDelay: '100ms' }}
          >
            Page Not Found
          </h2>
          <p 
            className={`font-[family-name:var(--font-body)] text-[#FDF8F3]/60 text-center mb-8 transition-all duration-1000 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
            style={{ transitionDelay: '200ms' }}
          >
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
          <div className="flex flex-col gap-3">
            <button 
              onClick={() => window.history.back()}
              className="group relative px-8 py-4 rounded-full font-[family-name:var(--font-body)] font-semibold text-base transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] border border-[#C9A962]/40 bg-transparent text-[#FDF8F3] hover:bg-[#C9A962]/10"
            >
              <span className="flex items-center justify-center gap-2">
                <ArrowLeft className="w-5 h-5" />
                Go Back
              </span>
            </button>
            <Link 
              href="/"
              className="group relative px-8 py-4 rounded-full font-[family-name:var(--font-body)] font-semibold text-base transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] text-center"
              style={{
                background: 'linear-gradient(135deg, #C9A962 0%, #D4B76A 50%, #E8D089 100%)',
                boxShadow: '0 4px 20px rgba(201, 169, 98, 0.3), 0 0 0 1px rgba(232, 208, 137, 0.1)',
                color: '#0B3D2C'
              }}
            >
              <span className="flex items-center justify-center gap-2">
                Home
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
