"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { PageBackground } from "@/components/page-background";
import { Logo } from "@/components/Logo";
import { useAuthToken } from "@convex-dev/auth/react";

export function AuthLoadingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <PageBackground variant="hero" />
      <div className="relative z-10">
        <div className="flex items-center justify-center mb-6">
          <Logo size="lg" />
        </div>
        <div className="animate-pulse rounded-2xl bg-[#0F4D38] border border-[#C9A962]/20 shadow-2xl p-12">
          <p className="font-[family-name:var(--font-body)] text-[#FDF8F3]/60 text-center">Loading...</p>
        </div>
      </div>
    </div>
  );
}

export function AuthNotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <PageBackground variant="hero" />
      <div className="relative z-10 w-full max-w-md">
        <div className="absolute -top-2 -left-2 w-6 h-6 border-l-2 border-t-2 border-[#C9A962]/40" />
        <div className="absolute -bottom-2 -right-2 w-6 h-6 border-r-2 border-b-2 border-[#C9A962]/40" />
        <div className="p-12 rounded-2xl bg-[#0F4D38] border border-[#C9A962]/20 shadow-2xl">
          <div className="flex items-center justify-center mb-6">
            <Logo size="lg" />
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-8xl font-bold text-[#FDF8F3] text-center mb-2">
            404
          </h1>
          <h2 className="font-[family-name:var(--font-display)] text-2xl text-[#FDF8F3] text-center mb-4">
            Page Not Found
          </h2>
          <p className="font-[family-name:var(--font-body)] text-[#FDF8F3]/60 text-center mb-8">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
          <div className="flex flex-col gap-3">
            <button 
              onClick={() => window.history.back()}
              className="group relative px-8 py-4 rounded-full font-[family-name:var(--font-body)] font-semibold text-base transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] border border-[#C9A962]/40 bg-transparent text-[#FDF8F3] hover:bg-[#C9A962]/10"
            >
              <span className="flex items-center justify-center gap-2">
                <ArrowLeft className="w-5 h-5" />
                Go Back
              </span>
            </button>
            <Link 
              href="/"
              className="group relative px-8 py-4 rounded-full font-[family-name:var(--font-body)] font-semibold text-base transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] text-center"
              style={{
                background: 'linear-gradient(135deg, #C9A962 0%, #D4B76A 50%, #E8D089 100%)',
                boxShadow: '0 4px 20px rgba(201, 169, 98, 0.3), 0 0 0 1px rgba(232, 208, 137, 0.1)',
                color: '#0B3D2C'
              }}
            >
              <span className="flex items-center justify-center gap-2">
                Home
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AuthRequired({ children }: { children: ReactNode }) {
  const token = useAuthToken();

  if (token === undefined) {
    return <AuthLoadingPage />;
  }

  if (token === null) {
    return <AuthNotFoundPage />;
  }

  return <>{children}</>;
}

export function useRequireAuth() {
  return {
    LoadingPage: AuthLoadingPage,
    NotFoundPage: AuthNotFoundPage,
  };
}
