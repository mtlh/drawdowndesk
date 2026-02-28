"use client";

import { Home, MonitorCheck, DollarSign, FlameKindling, MoveUpRightIcon, LineChartIcon, ChevronRight, FileChartPie, Wallet, FileText, User } from "lucide-react"
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { usePathname } from "next/navigation";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"

// Menu sections with grouped items
const menuSections = [
  {
    section: "Portfolio",
    items: [
      {
        title: "Net Worth",
        url: "/net-worth",
        icon: Wallet,
      },
      {
        title: "Holdings Overview",
        url: "/",
        icon: Home,
      },
      {
        title: "Holdings",
        url: "/holdings",
        icon: FileChartPie,
      },
      {
        title: "Goals",
        url: "/goal-tracker",
        icon: MonitorCheck,
      },
      {
        title: "Planning Notes",
        url: "/finance-notes",
        icon: FileText,
      }
    ]
  },
  {
    section: "Calculators",
    items: [
      {
        title: "Cashflow Forecast",
        url: "/cashflow-calculator",
        icon: FlameKindling,
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
      }
    ]
  },
  {
    section: "Tax Planning",
    items: [
      {
        title: "One off Capital Gain Calculator",
        url: "/one-off-cgt",
        icon: DollarSign,
      }
    ]
  }
]

import favicon from "../app/favicon.ico";
import Image from "next/image";
import { SignIn, SignOut } from "@/components/SignIn";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

export function AppSidebar() {
  const pathname = usePathname()

  // Check if a menu item is active
  const isActive = (url: string) => {
    if (url === "/") {
      return pathname === "/"
    }
    return pathname.startsWith(url)
  }

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup className="gap-4">
          <SidebarGroupLabel>
            <Link className="flex items-center gap-2 text-xl font-bold" href={"/"}>
              <span>
                <Image src={favicon} alt="Drawdown Desk" width={24} height={24} />
              </span>
              Drawdown Desk
            </Link>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuSections.map((section) => (
                <Collapsible key={section.section} defaultOpen className="group/collapsible">
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton>
                        {section.section}
                        <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {section.items.map((item) => (
                          <SidebarMenuSubItem key={item.title}>
                            <SidebarMenuButton asChild isActive={isActive(item.url)}>
                              <Link href={item.url}>
                                <item.icon />
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
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarGroup className="gap-4">
          <Authenticated>
            <Link href="/settings" className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent rounded-md w-full">
              <User className="h-4 w-4" />
              Profile / Settings
            </Link>
            <SignOut />
          </Authenticated>
          <Unauthenticated>
            <SignIn />
          </Unauthenticated>
          <AuthLoading>
            <Skeleton />
          </AuthLoading>
        </SidebarGroup>
      </SidebarFooter>
    </Sidebar>
  )
}