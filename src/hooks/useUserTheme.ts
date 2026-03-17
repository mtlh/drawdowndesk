"use client"

import { useSyncExternalStore, useEffect } from "react"
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

function getLocalStorageTheme(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem('theme');
    return (stored === 'light' || stored === 'dark') ? stored : null;
  } catch {
    return null;
  }
}

function subscribeToLocalStorage(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener('theme-change', callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener('theme-change', callback);
  };
}

export function useUserTheme() {
  const user = useCurrentUser()
  const ensureSettings = useMutation(api.tax.userSettings.ensureUserSettings)
  const userSettings = useQuery(
    api.tax.userSettings.getUserSettings,
    user ? { userId: user._id as Id<"users"> } : "skip"
  ) as UserSettingsData | null | undefined
  const updateTheme = useMutation(api.tax.userSettings.saveUserSettings)
  
  const localTheme = useSyncExternalStore(
    subscribeToLocalStorage,
    getLocalStorageTheme,
    () => null
  )

  // Ensure settings exist on first load
  useEffect(() => {
    if (user && !userSettings) {
      ensureSettings({ userId: user._id as Id<"users"> })
    }
  }, [user, userSettings, ensureSettings])

  // Use DB value if loaded, otherwise use localStorage
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
    try {
      localStorage.setItem('theme', newTheme)
    } catch {
      // localStorage not available
    }
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
