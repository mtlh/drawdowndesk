"use client";

import { Home, MonitorCheck, DollarSign, FlameKindling, MoveUpRightIcon, LineChartIcon, ChevronRight, FileChartPie, Wallet, FileText, User, ArrowLeftRight, Briefcase, Calculator, Receipt, Leaf, ArrowRight, GitCompare, TrendingUp, Landmark, BarChart3, PieChart } from "lucide-react"
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
} from "@/components/ui/sidebar"
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"
import { Separator } from "@/components/ui/separator"

const menuSections = [
  {
    section: "Portfolio",
    icon: Briefcase,
    items: [
      {
        title: "Net Worth",
        url: "/net-worth",
        icon: Wallet,
      },
      {
        title: "Holdings Overview",
        url: "/holdings-overview",
        icon: Home,
      },
      {
        title: "Holdings",
        url: "/holdings",
        icon: FileChartPie,
      },
      {
        title: "Transactions",
        url: "/transactions",
        icon: ArrowLeftRight,
      },
      {
        title: "Dividends",
        url: "/dividend-calculator",
        icon: DollarSign,
      },
      {
        title: "Goals",
        url: "/goal-tracker",
        icon: MonitorCheck,
      },
      {
        title: "Budget",
        url: "/budget",
        icon: PieChart,
      },
      {
        title: "Planning Notes",
        url: "/finance-notes",
        icon: FileText,
      },
      {
        title: "Holdings Performance",
        url: "/holdings-performance",
        icon: TrendingUp,
      }
    ]
  },
  {
    section: "Calculators",
    icon: Calculator,
    items: [
      {
        title: "Coast FI",
        url: "/lifetime-accumulation",
        icon: FlameKindling,
      },
      {
        title: "Cashflow Forecast",
        url: "/cashflow-calculator",
        icon: BarChart3,
      },
      {
        title: "What-If Scenarios",
        url: "/what-if-scenarios",
        icon: GitCompare,
      },
      {
        title: "Accumulation Forecast",
        url: "/accumulation-forecast",
        icon: MoveUpRightIcon,
      },
      {
        title: "Monte Carlo Simulator",
        url: "/monte-carlo-simulator",
        icon: LineChartIcon,
      },
    ]
  },
  {
    section: "Tax Planning",
    icon: Receipt,
    items: [
      {
        title: "Tax-Loss Harvesting",
        url: "/tax-loss-harvesting",
        icon: Leaf,
      },
      {
        title: "One off Capital Gain Calculator",
        url: "/one-off-cgt",
        icon: Landmark,
      },
      {
        title: "Bed-and-ISA",
        url: "/bed-and-isa",
        icon: ArrowRight,
      }
    ]
  }
]

import favicon from "../app/favicon.ico";
import Image from "next/image";
import { SignIn } from "@/components/SignIn";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthActions } from "@convex-dev/auth/react";

function SignOutButton() {
  const { signOut } = useAuthActions();
  return (
    <button
      onClick={() => void signOut()}
      className="flex items-center gap-3 px-3 py-2.5 text-sm text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-all duration-150 w-full"
    >
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/20 flex items-center justify-center">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      </div>
      <span className="font-medium">Sign out</span>
    </button>
  );
}

export function AppSidebar() {
  const pathname = usePathname()

  const isActive = (url: string) => {
    if (url === "/") {
      return pathname === "/"
    }
    return pathname === url || pathname === url + "/"
  }

  return (
    <Sidebar className="border-r border-border/50">
      <SidebarResizeHandle />
      <div className="pt-4 flex flex-col h-full">
        {/* Fixed Header */}
        <div className="flex-none px-2 mb-2">
          <Link 
            href={"/"} 
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg shadow-blue-600/20 group"
          >
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center backdrop-blur-sm">
              <Image src={favicon} alt="Drawdown Desk" width={20} height={20} className="invert" />
            </div>
            <div className="flex flex-col">
              <span className="text-white font-bold text-sm leading-tight">Drawdown Desk</span>
              <span className="text-blue-100/70 text-xs">Portfolio Tracker</span>
            </div>
          </Link>
        </div>

        {/* Scrollable Menu */}
        <div className="flex-1 overflow-y-auto px-2">
          <SidebarGroup className="gap-1">
            <SidebarMenu className="gap-1">
              {menuSections.map((section) => (
                <Collapsible key={section.section} defaultOpen className="group/collapsible">
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-lg transition-all duration-150">
                        <section.icon className="w-4 h-4" />
                        <span className="uppercase tracking-wider">{section.section}</span>
                        <ChevronRight className="ml-auto w-3.5 h-3.5 transition-transform group-data-[state=open]/collapsible:rotate-90" />
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
                                <item.icon className="w-4 h-4 text-muted-foreground group-hover/menu-item:text-foreground" />
                                <span>{item.title}</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </div>

        {/* Fixed Footer */}
        <SidebarFooter className="pb-4 flex-none">
        <div className="px-2">
          <Separator className="mb-4" />
          <SidebarGroup className="gap-2 flex-none">
            <Authenticated>
              <div className="flex flex-col gap-1">
                <Link 
                  href="/settings" 
                  className="flex items-center gap-3 px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-lg transition-all duration-150"
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                  <span className="font-medium">Settings</span>
                </Link>
                <SignOutButton />
              </div>
            </Authenticated>
            <Unauthenticated>
              <SignIn />
            </Unauthenticated>
            <AuthLoading>
              <Skeleton className="h-9 w-full" />
            </AuthLoading>
          </SidebarGroup>
        </div>
      </SidebarFooter>
      </div>
    </Sidebar>
  )
}