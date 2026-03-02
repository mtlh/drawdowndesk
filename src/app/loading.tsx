"use client"

import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "./SideBar"
import { AppHeader } from "@/components/AppHeader"

export default function RootLoading() {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <AppHeader />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-muted-foreground">Loading...</div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
