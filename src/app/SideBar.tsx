"use client";

import { Home, MonitorCheck, DollarSign, FlameKindling, MoveUpRightIcon, MoonIcon, LineChartIcon } from "lucide-react"
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";

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
} from "@/components/ui/sidebar"

// Menu items.
const items = [
  {
    title: "Home",
    url: "/",
    icon: Home,
  },
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
  },
  {
    title: "One off Capital Gain Calculator",
    url: "/one-off-cgt",
    icon: DollarSign,
  },
  {
    title: "Goal Tracker",
    url: "/goal-tracker",
    icon: MonitorCheck,
  }
]

import favicon from "../app/favicon.ico";
import Image from "next/image";
import { SignIn, SignOut } from "@/components/SignIn";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export function AppSidebar() {
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
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenuButton asChild>
          <Button variant="ghost" onClick={() => { 
            document.documentElement.classList.toggle('dark');
            localStorage.setItem("theme", document.documentElement.classList.contains('dark') ? "dark" : "light");
            }}>
            <MoonIcon />
            <span>Toggle light/dark mode</span>
          </Button>
        </SidebarMenuButton>
        <SidebarGroup className="gap-4">
          <Authenticated>
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