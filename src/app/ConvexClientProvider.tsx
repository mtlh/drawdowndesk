"use client";

import { Authenticated, ConvexReactClient, Unauthenticated } from "convex/react";
import { ReactNode } from "react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "./SideBar";
import Login from "./login";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexAuthProvider client={convex}>
      <Authenticated>
        <SidebarProvider>
          <AppSidebar />
          <main style={{ width: "inherit" }}>
            <SidebarTrigger />
              {children}
          </main>
        </SidebarProvider>
      </Authenticated>
      <Unauthenticated>
        <Login />
      </Unauthenticated>
    </ConvexAuthProvider>
  );
}