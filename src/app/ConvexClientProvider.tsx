"use client";

import { Authenticated, ConvexReactClient, Unauthenticated } from "convex/react";
import { ReactNode } from "react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "./SideBar";
import { AppHeader } from "@/components/AppHeader";
import Login from "./login";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexAuthProvider client={convex}>
      <Authenticated>
        <SidebarProvider>
          <div className="flex min-h-screen w-full">
            <AppSidebar />
            <div className="flex flex-1 flex-col">
              <AppHeader />
              <main className="flex-1">
                {children}
              </main>
            </div>
          </div>
        </SidebarProvider>
      </Authenticated>
      <Unauthenticated>
        <Login />
      </Unauthenticated>
    </ConvexAuthProvider>
  );
}