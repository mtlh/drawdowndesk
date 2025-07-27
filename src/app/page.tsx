"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowRight, TrendingUp, Calculator, Target } from "lucide-react";
import { redirect } from "next/dist/client/components/redirect";
import React from "react";
import favicon from "../app/favicon.ico";
import Image from "next/image";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const { signIn } = useAuthActions();
  const redirectTo = typeof window !== "undefined" ? window.location.href : "/";
  
  return (
    <div className="font-sans grid grid-rows-[auto_1fr_auto] min-h-screen p-8 gap-8 sm:p-20 bg-background">
      <div className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <Image
              src={favicon}
              alt="Drawdown Desk"
              width={40}
              height={40}
              className="mx-auto mb-4"
            />
            <h2 className="text-4xl font-bold mb-4">
              Professional Financial Planning & Analysis
            </h2>
            <h4 className="text-lg max-w-3xl mx-auto mb-8 italic">
              Comprehensive tooling for retirement planning, wealth management, and financial forecasting. Make
              informed decisions with advanced modeling and simulation capabilities with Drawdown Desk today!
            </h4>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Unauthenticated>
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700" onClick={() => void signIn("google", {redirectTo: redirectTo})}>
                  Get Started
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Unauthenticated>
              <AuthLoading>
                <Skeleton />
              </AuthLoading>
              <Authenticated>
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700" onClick={() => redirect("/cashflow-calculator")}>
                  Start a cashflow forcast
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Authenticated>
            </div>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-center text-2xl">Ready to Start Planning?</CardTitle>
              <CardDescription className="text-center text-lg">
                Choose a tool to begin your financial analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Button
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-center space-y-2 bg-transparent"
                  onClick={() => redirect("/cashflow-calculator")}
                >
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                  <span>Start Cashflow Analysis</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-center space-y-2 bg-transparent"
                  onClick={() => redirect("/monte-carlo-simulator")}
                >
                  <Calculator className="w-6 h-6 text-purple-600" />
                  <span>Run Monte Carlo</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-center space-y-2 bg-transparent"
                  onClick={() => redirect("/goal-tracker")}
                >
                  <Target className="w-6 h-6 text-red-600" />
                  <span>Set Financial Goals</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}  