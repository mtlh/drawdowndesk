"use client";

import { ConvexReactClient } from "convex/react";
import { ReactNode } from "react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "./SideBar";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return <ConvexAuthProvider client={convex}>
    <SidebarProvider>
        <AppSidebar />
        <main style={{ width: "inherit" }}>
          <SidebarTrigger />
            {children}
        </main>
      </SidebarProvider>
    </ConvexAuthProvider>;
}