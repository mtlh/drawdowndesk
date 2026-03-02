"use client"

import { useEffect, useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "../../convex/_generated/api"
import { Id } from "../../convex/_generated/dataModel"
import { useCurrentUser } from "@/hooks/useCurrentUser"

interface UserSettingsData {
  theme: "light" | "dark"
  statePensionAmount: number
  statePensionAge: number
  isRetired: boolean
}

export function useUserTheme() {
  const user = useCurrentUser()
  const ensureSettings = useMutation(api.tax.userSettings.ensureUserSettings)
  const userSettings = useQuery(
    api.tax.userSettings.getUserSettings,
    user ? { userId: user._id as Id<"users"> } : "skip"
  ) as UserSettingsData | null | undefined
  const updateTheme = useMutation(api.tax.userSettings.saveUserSettings)
  const [isInitialized, setIsInitialized] = useState(false)
  const [localTheme, setLocalTheme] = useState<string | null>(null)

  // Read localStorage after mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('theme')
      if (stored === 'light' || stored === 'dark') {
        setLocalTheme(stored)
      }
    } catch {
      // localStorage not available
    }
  }, [])

  // Ensure settings exist on first load
  useEffect(() => {
    if (user && !isInitialized) {
      ensureSettings({ userId: user._id as Id<"users"> }).then(() => {
        setIsInitialized(true)
      })
    }
  }, [user, isInitialized, ensureSettings])

  // Use DB value if loaded, otherwise use localStorage
  // Don't override - let layout script handle the initial theme
  const theme = userSettings !== undefined
    ? userSettings?.theme
    : (localTheme ?? undefined)

  // Sync to localStorage when theme changes from DB
  useEffect(() => {
    if (userSettings !== undefined && theme) {
      try {
        localStorage.setItem('theme', theme)
      } catch {
        // localStorage not available
      }
    }
  }, [theme, userSettings])

  const setTheme = (newTheme: "light" | "dark") => {
    // Save to localStorage immediately for flash prevention
    try {
      localStorage.setItem('theme', newTheme)
    } catch {
      // localStorage not available
    }
    // Apply to DOM immediately for instant toggle
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
    if (user) {
      updateTheme({
        userId: user._id as Id<"users">,
        theme: newTheme,
        statePensionAmount: userSettings?.statePensionAmount ?? 11000,
        statePensionAge: userSettings?.statePensionAge ?? 67,
        isRetired: userSettings?.isRetired,
      })
    }
  }

  return { theme, setTheme, isLoading: !userSettings }
}
