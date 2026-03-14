"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export function PasswordSignIn() {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const [step, setStep] = useState<"signIn" | "signUp">("signIn");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    
    const formData = new FormData(event.currentTarget);
    
    try {
      const result = await signIn("password", formData);
      if (result && "error" in result) {
        const errorMsg = result.error as string;
        if (errorMsg.includes("InvalidAccountId") || errorMsg.includes("no user found")) {
          setError("Invalid email or password");
        } else if (errorMsg.includes("already exists")) {
          setError("An account with this email already exists");
        } else {
          setError(errorMsg);
        }
      } else {
        router.push("/holdings");
      }
    } catch (err) {
      setError("Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="email" className="text-xs text-slate-400">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="you@example.com"
          required
          className="h-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      
      <div className="space-y-1">
        <Label htmlFor="password" className="text-xs text-slate-400">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="••••••••"
          required
          minLength={8}
          className="h-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <input name="flow" type="hidden" value={step} />

      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      <Button
        type="submit"
        disabled={loading}
        className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
      >
        {loading ? "Please wait..." : step === "signIn" ? "Sign in" : "Create account"}
      </Button>

      <button
        type="button"
        onClick={() => {
          setStep(step === "signIn" ? "signUp" : "signIn");
          setError("");
        }}
        className="w-full text-xs text-slate-400 hover:text-white transition-colors py-1"
      >
        {step === "signIn" ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
      </button>
    </form>
  );
}
