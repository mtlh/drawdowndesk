"use client";

import { useState, useEffect } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useFireMetrics } from "@/context/FireMetricsContext";
import {
  Home,
  MonitorCheck,
  DollarSign,
  FlameKindling,
  MoveUpRightIcon,
  LineChartIcon,
  ChevronRight,
  FileChartPie,
  Wallet,
  FileText,
  User,
  ArrowLeftRight,
  Leaf,
  ArrowRight,
  GitCompare,
  TrendingUp,
  Landmark,
  BarChart3,
  PieChart,
} from "lucide-react";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { usePathname } from "next/navigation";

import {
  Sidebar,
  SidebarFooter,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarResizeHandle,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";

const coreSections = [
  {
    title: "Investments",
    icon: TrendingUp,
    items: [
      { title: "Net Worth", url: "/net-worth", icon: Wallet },
      { title: "FIRE Metrics", url: "/fire-metrics", icon: FlameKindling },
      { title: "Holdings Overview", url: "/holdings-overview", icon: Home },
      { title: "Holdings", url: "/holdings", icon: FileChartPie },
      { title: "Transactions", url: "/transactions", icon: ArrowLeftRight },
      { title: "Dividends", url: "/dividend-calculator", icon: DollarSign },
      { title: "Holdings Performance", url: "/holdings-performance", icon: TrendingUp },
    ],
  },
  {
    title: "Planning",
    icon: PieChart,
    items: [
      { title: "Goals", url: "/goal-tracker", icon: MonitorCheck },
      { title: "Budget", url: "/budget", icon: PieChart },
      { title: "Planning Notes", url: "/finance-notes", icon: FileText },
    ],
  },
];

const extrasSections = [
  {
    id: "calculators",
    title: "Calculators",
    icon: FlameKindling,
    items: [
      { title: "Coast FI", url: "/lifetime-accumulation", icon: FlameKindling },
      { title: "Cashflow Forecast", url: "/cashflow-calculator", icon: BarChart3 },
      { title: "What-If Scenarios", url: "/what-if-scenarios", icon: GitCompare },
      { title: "Accumulation Forecast", url: "/accumulation-forecast", icon: MoveUpRightIcon },
      { title: "Monte Carlo Simulator", url: "/monte-carlo-simulator", icon: LineChartIcon },
    ],
  },
  {
    id: "taxPlanning",
    title: "Tax Planning",
    icon: Leaf,
    items: [
      { title: "Tax-Loss Harvesting", url: "/tax-loss-harvesting", icon: Leaf },
      { title: "One-off Capital Gain Calculator", url: "/one-off-cgt", icon: Landmark },
      { title: "Bed-and-ISA", url: "/bed-and-isa", icon: ArrowRight },
    ],
  },
];

import favicon from "../app/favicon.ico";
import Image from "next/image";
import { SignIn } from "@/components/SignIn";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

export function AppSidebar() {
  const pathname = usePathname();
  const { signOut } = useAuthActions();
  const { fiPercent } = useFireMetrics();
  // Accordion: only one extras section open at a time, both default to closed
  const [openExtra, setOpenExtra] = useState<string | null>(null);

  const isActive = (url: string) => {
    if (url === "/") {
      return pathname === "/";
    }
    return pathname === url || pathname === url + "/";
  };

  const toggleExtra = (id: string) => {
    setOpenExtra((prev) => (prev === id ? null : id));
  };

  return (
    <Sidebar className="border-r border-border/50">
      <SidebarResizeHandle />
      <div className="pt-4 flex flex-col h-full">
        {/* Brand header */}
        <div className="flex-none px-3 mb-3">
          <Link
            href={"/"}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border/60 hover:border-border hover:bg-accent/40 transition-all duration-200 group"
          >
            <div className="w-10 h-10 rounded-md bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm shadow-blue-500/20 shrink-0">
              <Image src={favicon} alt="Drawdown Desk" width={20} height={20} className="invert" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-foreground font-semibold text-base leading-tight truncate">Drawdown Desk</span>
              <span className="text-muted-foreground text-xs leading-tight">Portfolio Tracker</span>
            </div>
          </Link>
        </div>

        {/* Scrollable menu */}
        <div className="flex-1 overflow-y-auto px-2">

          {/* ── CORE: always open ─────────────────────── */}
          <SidebarGroup className="gap-1">
            <SidebarMenu className="gap-1">
              {coreSections.map((section) => (
                <div key={section.title}>
                  {/* Section header */}
                  <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground">
                    <section.icon className="w-4 h-4" />
                    <span className="uppercase tracking-wider">{section.title}</span>
                  </div>
                  {/* Items */}
                  <SidebarMenuSub className="border-l-2 border-border/50 ml-2 mb-2">
                    {section.items.map((item) => (
                      <SidebarMenuSubItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive(item.url)}
                          className="px-3 py-2 ml-1 rounded-lg text-sm transition-all duration-150 data-[active=true]:bg-blue-50 dark:data-[active=true]:bg-blue-950/30 data-[active=true]:text-blue-700 dark:data-[active=true]:text-blue-300 data-[active=true]:font-medium hover:bg-accent/50"
                        >
                            <Link href={item.url} className="flex items-center gap-3">
                            <div className="relative">
                              <item.icon className="w-4 h-4 text-muted-foreground" />
                              {item.title === "FIRE Metrics" && fiPercent !== null && fiPercent >= 1 && (
                                <span className="absolute -top-1.5 -right-3 min-w-[18px] h-4 px-1 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                                  {fiPercent.toFixed(0)}%
                                </span>
                              )}
                            </div>
                            <span>
                              {item.title === "FIRE Metrics" && fiPercent !== null && fiPercent >= 1
                                ? `FIRE Metrics (${fiPercent.toFixed(1)}%)`
                                : item.title}
                            </span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </div>
              ))}
            </SidebarMenu>
          </SidebarGroup>

          {/* ── Divider: Core vs Extras ───────────────────── */}
          <div className="flex items-center gap-2 px-3 py-2 mt-1">
            <Separator className="flex-1" />
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
              Extras
            </span>
            <Separator className="flex-1" />
          </div>

          {/* ── EXTRAS: accordion, only one open at a time ─── */}
          <SidebarGroup className="gap-1">
            <SidebarMenu className="gap-1">
              {extrasSections.map((section) => {
                const isOpen = openExtra === section.id;
                return (
                  <Collapsible
                    key={section.id}
                    open={isOpen}
                    onOpenChange={() => toggleExtra(section.id)}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-lg transition-all duration-150">
                          <section.icon className="w-4 h-4" />
                          <span className="uppercase tracking-wider">{section.title}</span>
                          <ChevronRight className="ml-auto w-3.5 h-3.5 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pt-1">
                        <SidebarMenuSub className="border-l-2 border-border/50 ml-2">
                          {section.items.map((item) => (
                            <SidebarMenuSubItem key={item.title}>
                              <SidebarMenuButton
                                asChild
                                isActive={isActive(item.url)}
                                className="px-3 py-2 ml-1 rounded-lg text-sm transition-all duration-150 data-[active=true]:bg-blue-50 dark:data-[active=true]:bg-blue-950/30 data-[active=true]:text-blue-700 dark:data-[active=true]:text-blue-300 data-[active=true]:font-medium hover:bg-accent/50"
                              >
                                <Link href={item.url} className="flex items-center gap-3">
                                  <item.icon className="w-4 h-4 text-muted-foreground" />
                                  <span>{item.title}</span>
                                </Link>
                              </SidebarMenuButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>

        </div>

        {/* Footer */}
        <SidebarFooter className="pb-4 flex-none">
          <div className="px-2">
            <Separator className="mb-3" />
            <Authenticated>
              <div className="flex flex-col gap-1 pl-4">
                <button
                  onClick={() => void signOut()}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all duration-150"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Sign out</span>
                </button>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === "/settings"}
                  className="px-3 py-2 rounded-lg text-sm transition-all duration-150 data-[active=true]:bg-blue-50 dark:data-[active=true]:bg-blue-950/30 data-[active=true]:text-blue-700 dark:data-[active=true]:text-blue-300 data-[active=true]:font-medium hover:bg-accent/50"
                >
                  <Link href="/settings" className="flex items-center gap-3">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </div>
            </Authenticated>
            <Unauthenticated>
              <SignIn />
            </Unauthenticated>
            <AuthLoading>
              <Skeleton className="h-9 w-full" />
            </AuthLoading>
          </div>
        </SidebarFooter>
      </div>
    </Sidebar>
  );
}
