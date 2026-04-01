"use client";

import { ConvexReactClient } from "convex/react";
import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ToastProvider } from "@/hooks/useToast";
import { AppSidebar } from "./SideBar";
import { AppHeader } from "@/components/AppHeader";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

function AppShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <AppHeader />
          <main className="flex-1 bg-background">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isPublicPage = pathname === "/" || pathname === "/login" || pathname === "/not-found";

  return (
    <ConvexAuthProvider client={convex}>
      {isPublicPage ? (
        <ErrorBoundary>
          <ToastProvider>
            {children}
          </ToastProvider>
        </ErrorBoundary>
      ) : (
        <AppShell>
          <ErrorBoundary>
            <ToastProvider>
              {children}
            </ToastProvider>
          </ErrorBoundary>
        </AppShell>
      )}
    </ConvexAuthProvider>
  );
}
