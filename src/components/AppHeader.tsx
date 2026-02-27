"use client";

import { usePathname } from "next/navigation";
import { Moon, Sun, PanelLeftClose, PanelLeft } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

const pageNames: Record<string, string> = {
  "/": "Portfolio Overview",
  "/holdings": "Holdings",
  "/cashflow-calculator": "Cashflow Calculator",
  "/monte-carlo-simulator": "Monte Carlo Simulator",
  "/one-off-cgt": "Capital Gains Tax",
};

export function AppHeader() {
  const pathname = usePathname();
  const { toggleSidebar, state } = useSidebar();
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    // Check initial theme
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "dark" : "light");
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    document.documentElement.classList.toggle("dark");
    localStorage.setItem("theme", newTheme);
  };

  const pageName = pageNames[pathname] || "Portfolio";

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-background px-6">
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
        <h1 className="text-lg font-semibold">{pageName}</h1>
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        className="shrink-0"
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
