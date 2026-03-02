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

/**
 * Hook to ensure user settings exist and get theme preference.
 * Creates default settings on first sign-in.
 * Returns theme from database, defaults to "dark".
 */
export function useUserTheme() {
  const user = useCurrentUser()
  const ensureSettings = useMutation(api.tax.userSettings.ensureUserSettings)
  const userSettings = useQuery(
    api.tax.userSettings.getUserSettings,
    user ? { userId: user._id as Id<"users"> } : "skip"
  ) as UserSettingsData | null | undefined
  const updateTheme = useMutation(api.tax.userSettings.saveUserSettings)
  const [isInitialized, setIsInitialized] = useState(false)

  // Ensure settings exist on first load
  useEffect(() => {
    if (user && !isInitialized) {
      ensureSettings({ userId: user._id as Id<"users"> }).then(() => {
        setIsInitialized(true)
      })
    }
  }, [user, isInitialized, ensureSettings])

  // Only use theme from DB when it's actually loaded (not during initial loading)
  // This prevents overwriting localStorage with default "dark" before DB value arrives
  const theme = userSettings !== undefined ? userSettings?.theme ?? "dark" : undefined

  // Sync theme to localStorage only when we have a confirmed value from DB
  useEffect(() => {
    if (theme) {
      try {
        localStorage.setItem('theme', theme)
      } catch {
        // localStorage not available
      }
    }
  }, [theme])

  const setTheme = (newTheme: "light" | "dark") => {
    // Also save to localStorage immediately for flash prevention
    try {
      localStorage.setItem('theme', newTheme)
    } catch {
      // localStorage not available
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
