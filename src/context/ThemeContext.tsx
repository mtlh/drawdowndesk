"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"

type Theme = "light" | "dark" | "system"

interface ThemeContextType {
  theme: Theme
  resolvedTheme: "light" | "dark"
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system")
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("dark")
  const [mounted, setMounted] = useState(false)

  // Initialize theme from localStorage
  useEffect(() => {
    setMounted(true)
    const savedTheme = localStorage.getItem("theme") as Theme | null
    if (savedTheme) {
      setThemeState(savedTheme)
    }
  }, [])

  // Update resolved theme whenever theme changes
  useEffect(() => {
    if (!mounted) return

    const root = document.documentElement
    
    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
      setResolvedTheme(systemTheme)
      root.classList.remove("light", "dark")
      root.classList.add(systemTheme)
    } else {
      setResolvedTheme(theme)
      root.classList.remove("light", "dark")
      root.classList.add(theme)
    }
  }, [theme, mounted])

  // Listen for system theme changes
  useEffect(() => {
    if (!mounted || theme !== "system") return

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = (e: MediaQueryListEvent) => {
      const newTheme = e.matches ? "dark" : "light"
      setResolvedTheme(newTheme)
      document.documentElement.classList.remove("light", "dark")
      document.documentElement.classList.add(newTheme)
    }

    mediaQuery.addEventListener("change", handler)
    return () => mediaQuery.removeEventListener("change", handler)
  }, [theme, mounted])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem("theme", newTheme)
  }

  const toggleTheme = () => {
    const newTheme = resolvedTheme === "dark" ? "light" : "dark"
    setTheme(newTheme)
  }

  // Prevent flash of wrong theme
  if (!mounted) {
    return <>{children}</>
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    // Return default values instead of throwing
    // This handles cases where the component renders before the provider is ready
    return {
      theme: "dark" as Theme,
      resolvedTheme: "dark" as "light" | "dark",
      setTheme: () => {},
      toggleTheme: () => {},
    }
  }
  return context
}

// Hook for chart colors that respond to theme
export function useChartColors() {
  const { resolvedTheme } = useTheme()
  
  return {
    colors: [
      "var(--chart-color-1)",
      "var(--chart-color-2)",
      "var(--chart-color-3)",
      "var(--chart-color-4)",
      "var(--chart-color-5)",
      "var(--chart-color-6)",
      "var(--chart-color-7)",
      "var(--chart-color-8)",
    ],
    positive: "var(--chart-positive)",
    negative: "var(--chart-negative)",
    neutral: "var(--chart-neutral)",
    highlight: "var(--chart-highlight)",
    grid: "var(--chart-grid)",
    axis: "var(--chart-axis)",
    text: "var(--chart-text)",
  }
}

// Utility to get CSS variable value
export function getCssVariable(name: string): string {
  if (typeof window === "undefined") return ""
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}
