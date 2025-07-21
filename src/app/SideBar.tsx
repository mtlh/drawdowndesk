"use client";

import { Home, MonitorCheck, DollarSign, FlameKindling, MoveUpRightIcon } from "lucide-react"
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";

import {
  Sidebar,
  SidebarContent,
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
    url: "/goal-tracker",
    icon: MoveUpRightIcon,
  },
  {
    title: "One off Cashflow",
    url: "/one-off-cashflow",
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

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup className="gap-4">
          <SidebarGroupLabel>
            <h2 className="flex items-center gap-2 text-xl font-bold">
              <span>
                <Image src={favicon} alt="Drawdown Desk" width={24} height={24} />
              </span>
              Drawdown Desk
            </h2>
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
        <SidebarGroup className="gap-4">
          <Authenticated>
            <SignOut />
          </Authenticated>
          <Unauthenticated>
            <SignIn />
          </Unauthenticated>
          <AuthLoading>
            <p>Loading...</p>
          </AuthLoading>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}