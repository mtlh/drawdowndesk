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

  const theme = userSettings?.theme ?? "dark"

  const setTheme = (newTheme: "light" | "dark") => {
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
