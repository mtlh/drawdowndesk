"use client"

import { useEffect, useState } from "react"

const PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  left: `${(i * 47) % 100}%`,
  top: `${(i * 31 + 11) % 100}%`,
  duration: 25 + (i * 11) % 30,
  delay: (i * 7) % 20
}))

interface PageBackgroundProps {
  variant?: "hero" | "section"
}

export function PageBackground({ variant = "section" }: PageBackgroundProps) {
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  if (!mounted) {
    return (
      <div className="absolute inset-0 overflow-hidden">
        <div 
          className="absolute inset-0"
          style={{
            background: `linear-gradient(180deg, #0D4F37 0%, #0B3D2C 50%, #082c20 100%)`
          }}
        />
      </div>
    )
  }

  const isHero = variant === "hero"

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div 
        className="absolute inset-0"
        style={{
          background: isHero 
            ? `radial-gradient(ellipse 120% 80% at 30% 20%, rgba(201, 169, 98, 0.08) 0%, transparent 50%),
               radial-gradient(ellipse 100% 60% at 70% 80%, rgba(45, 122, 95, 0.15) 0%, transparent 40%),
               radial-gradient(ellipse 80% 50% at 50% 50%, rgba(26, 92, 69, 0.2) 0%, transparent 60%),
               linear-gradient(180deg, #0D4F37 0%, #0B3D2C 40%, #082c20 100%)`
            : `radial-gradient(ellipse 150% 100% at 50% 0%, rgba(26, 92, 69, 0.12) 0%, transparent 50%),
               radial-gradient(ellipse 100% 100% at 80% 100%, rgba(201, 169, 98, 0.06) 0%, transparent 40%),
               linear-gradient(180deg, #0B3D2C 0%, #082c20 100%)`
        }}
      />
      
      {isHero && (
        <div className="absolute inset-0">
          <div 
            className="absolute rounded-full"
            style={{
              width: '900px',
              height: '900px',
              background: 'radial-gradient(circle, rgba(201, 169, 98, 0.1) 0%, rgba(201, 169, 98, 0.03) 40%, transparent 70%)',
              filter: 'blur(100px)',
              top: '-30%',
              left: '-10%',
              animation: 'heroFloat1 35s ease-in-out infinite'
            }}
          />
          <div 
            className="absolute rounded-full"
            style={{
              width: '700px',
              height: '700px',
              background: 'radial-gradient(circle, rgba(45, 122, 95, 0.15) 0%, rgba(45, 122, 95, 0.04) 50%, transparent 70%)',
              filter: 'blur(80px)',
              top: '20%',
              right: '-10%',
              animation: 'heroFloat2 40s ease-in-out infinite'
            }}
          />
          <div 
            className="absolute rounded-full"
            style={{
              width: '800px',
              height: '800px',
              background: 'radial-gradient(circle, rgba(15, 77, 56, 0.18) 0%, rgba(15, 77, 56, 0.05) 45%, transparent 70%)',
              filter: 'blur(90px)',
              bottom: '-30%',
              left: '20%',
              animation: 'heroFloat3 45s ease-in-out infinite'
            }}
          />
        </div>
      )}
      
      <div 
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(201, 169, 98, 0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(201, 169, 98, 0.5) 1px, transparent 1px)
          `,
          backgroundSize: '100px100px',
          maskImage: 'radial-gradient(ellipse 95% 95% at 50% 50%, black 20%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse 95% 95% at 50% 50%, black 20%, transparent 80%)'
        }}
      />
      
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `repeating-linear-gradient(
            45deg,
            transparent,
            transparent 150px,
            rgba(201, 169, 98, 0.25) 150px,
            rgba(201, 169, 98, 0.25) 151px
          )`
        }}
      />
      
      {isHero && (
        <div className="absolute inset-0">
          <div 
            className="absolute rounded-full border border-[#C9A962]/[0.04]"
            style={{
              width: '500px',
              height: '500px',
              top: '5%',
              right: '5%',
              animation: 'rotateSlow 80s linear infinite'
            }}
          />
          <div 
            className="absolute rounded-full border border-[#C9A962]/[0.03]"
            style={{
              width: '400px',
              height: '400px',
              bottom: '10%',
              left: '3%',
              animation: 'rotateSlowReverse 60s linear infinite'
            }}
          />
        </div>
      )}
      
      <div 
        className="absolute inset-0 opacity-[0.008] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          mixBlendMode: 'overlay'
        }}
      />
      
      <div 
        className="absolute inset-0"
        style={{
          background: isHero 
            ? 'radial-gradient(ellipse 80% 80% at 50% 50%, transparent 0%, rgba(8, 44, 32, 0.5) 100%)'
            : 'radial-gradient(ellipse 90% 90% at 50% 50%, transparent 10%, rgba(8, 44, 32, 0.4) 100%)'
        }}
      />
      
      {isHero && (
        <div 
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px]"
          style={{
            background: 'radial-gradient(ellipse at top, rgba(201, 169, 98, 0.05) 0%, transparent 70%)',
            filter: 'blur(60px)'
          }}
        />
      )}
      
      <div className="absolute inset-0 overflow-hidden">
        {PARTICLES.map((particle) => (
          <div
            key={particle.id}
            className="absolute w-1 h-1 rounded-full bg-[#C9A962]/[0.08]"
            style={{
              left: particle.left,
              top: particle.top,
              animation: `particleFloat ${particle.duration}s ease-in-out infinite`,
              animationDelay: `${particle.delay}s`
            }}
          />
        ))}
      </div>
      
      <style jsx>{`
        @keyframes heroFloat1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(80px, 40px) scale(1.1); }
          66% { transform: translate(-50px, 60px) scale(0.95); }
        }
        
        @keyframes heroFloat2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-80px, 50px) scale(1.05); }
        }
        
        @keyframes heroFloat3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(60px, -40px) scale(0.98); }
          75% { transform: translate(-30px, 30px) scale(1.02); }
        }
        
        @keyframes rotateSlow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes rotateSlowReverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        
        @keyframes particleFloat {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.08; }
          25% { transform: translateY(-40px) translateX(15px); opacity: 0.15; }
          50% { transform: translateY(-25px) translateX(-15px); opacity: 0.05; }
          75% { transform: translateY(-50px) translateX(8px); opacity: 0.12; }
        }
      `}</style>
    </div>
  )
}