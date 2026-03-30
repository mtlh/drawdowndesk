"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";

export function PasswordSignIn() {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const [step, setStep] = useState<"signIn" | "signUp">("signIn");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
    } catch {
      setError("Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label 
          htmlFor="email" 
          className="font-[family-name:var(--font-body)] text-xs text-[#FDF8F3]/60 uppercase tracking-wider"
        >
          Email Address
        </label>
        <div className="relative group">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#C9A962]/50 group-focus-within:text-[#C9A962] transition-colors" />
          <input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            required
            className="w-full h-11 pl-10 pr-4 rounded-lg bg-[#FDF8F3]/5 border border-[#C9A962]/20 text-[#FDF8F3] placeholder:text-[#FDF8F3]/30 font-[family-name:var(--font-body)] text-sm transition-all duration-300 focus:outline-none focus:border-[#C9A962]/50 focus:bg-[#FDF8F3]/10"
          />
        </div>
      </div>
      
      <div className="space-y-1.5">
        <label 
          htmlFor="password" 
          className="font-[family-name:var(--font-body)] text-xs text-[#FDF8F3]/60 uppercase tracking-wider"
        >
          Password
        </label>
        <div className="relative group">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#C9A962]/50 group-focus-within:text-[#C9A962] transition-colors" />
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            required
            minLength={8}
            className="w-full h-11 pl-10 pr-11 rounded-lg bg-[#FDF8F3]/5 border border-[#C9A962]/20 text-[#FDF8F3] placeholder:text-[#FDF8F3]/30 font-[family-name:var(--font-body)] text-sm transition-all duration-300 focus:outline-none focus:border-[#C9A962]/50 focus:bg-[#FDF8F3]/10"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#C9A962]/50 hover:text-[#C9A962] transition-colors"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <input name="flow" type="hidden" value={step} />

      {error && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#E85D4E]/10 border border-[#E85D4E]/30">
          <div className="w-1.5 h-1.5 rounded-full bg-[#E85D4E]" />
          <p className="font-[family-name:var(--font-body)] text-xs text-[#E85D4E]">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full h-11 rounded-lg bg-gradient-to-r from-[#C9A962] to-[#D4B76A] text-[#0B3D2C] font-[family-name:var(--font-body)] font-semibold text-sm transition-all duration-300 hover:shadow-lg hover:shadow-[#C9A962]/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Please wait...
          </span>
        ) : (
          step === "signIn" ? "Sign in" : "Create account"
        )}
      </button>

      <div className="pt-2 text-center">
        <button
          type="button"
          onClick={() => {
            setStep(step === "signIn" ? "signUp" : "signIn");
            setError("");
          }}
          className="font-[family-name:var(--font-body)] text-xs text-[#FDF8F3]/50 hover:text-[#C9A962] transition-colors duration-300"
        >
          {step === "signIn" ? "Don't have an account? " : "Already have an account? "}
          <span className="text-[#C9A962] font-medium">
            {step === "signIn" ? "Sign up" : "Sign in"}
          </span>
        </button>
      </div>
    </form>
  );
}
