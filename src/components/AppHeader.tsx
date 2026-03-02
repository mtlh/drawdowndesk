"use client";

import { usePathname } from "next/navigation";
import { Moon, Sun, PanelLeftClose, PanelLeft } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { useUserTheme } from "@/hooks/useUserTheme";

interface PageInfo {
  title: string
  subtitle: string
  buttons?: React.ReactNode
}

const pageInfo: Record<string, PageInfo> = {
  "/": {
    title: "Sign In",
    subtitle: "Sign in to access your portfolio",
  },
  "/holdings-overview": {
    title: "Holdings Overview",
    subtitle: "Track your investments across all accounts",
  },
  "/net-worth": {
    title: "Net Worth",
    subtitle: "Track all your accounts and assets",
  },
  "/holdings": {
    title: "Holdings",
    subtitle: "Manage your investment portfolios and holdings",
  },
  "/transactions": {
    title: "Transactions",
    subtitle: "View and manage your transaction history",
  },
  "/goal-tracker": {
    title: "Goal Tracker",
    subtitle: "Set financial goals and track your progress",
  },
  "/finance-notes": {
    title: "Planning Notes",
    subtitle: "Your personal space for financial planning notes",
  },
  "/cashflow-calculator": {
    title: "Cashflow Forecast",
    subtitle: "Plan your retirement income across different account types",
  },
  "/accumulation-forecast": {
    title: "Accumulation Forecast",
    subtitle: "Project your wealth accumulation over time",
  },
  "/monte-carlo-simulator": {
    title: "Monte Carlo Simulator",
    subtitle: "Simulate investment returns with probability analysis",
  },
  "/one-off-cgt": {
    title: "Capital Gains Tax",
    subtitle: "Calculate tax implications of lump sum withdrawals",
  },
};

export function AppHeader() {
  const pathname = usePathname();
  const { toggleSidebar, state } = useSidebar();
  const { theme, setTheme } = useUserTheme();

  useEffect(() => {
    // Apply theme from database once loaded (skip when undefined to let layout script handle it)
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else if (theme === "light") {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  // Handle dynamic routes
  const getPageInfo = (): PageInfo => {
    if (pageInfo[pathname]) return pageInfo[pathname]

    // Check for dynamic routes
    if (pathname.startsWith("/holdings/")) {
      return { title: "Holdings", subtitle: "View portfolio details" }
    }
    return { title: "Dashboard", subtitle: "" }
  }

  const page = getPageInfo()

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-4 border-b bg-background px-6">
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleSidebar}
        className="shrink-0"
      >
        {state === "expanded" ? (
          <PanelLeftClose className="h-4 w-4" />
        ) : (
          <PanelLeft className="h-4 w-4" />
        )}
        <span className="sr-only">Toggle sidebar</span>
      </Button>

      <div className="flex-1">
        <h1 className="text-xl font-semibold leading-tight">{page.title}</h1>
        {page.subtitle && (
          <p className="text-sm text-muted-foreground">{page.subtitle}</p>
        )}
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        className="shrink-0 transition-transform hover:scale-110 active:scale-95"
      >
        {theme === "light" ? (
          <Moon className="h-4 w-4" />
        ) : (
          <Sun className="h-4 w-4" />
        )}
        <span className="sr-only">Toggle theme</span>
      </Button>
    </header>
  );
}
