"use client";

import { useAuthActions } from "@convex-dev/auth/react";
 
export function SignIn() {
  const { signIn } = useAuthActions();
  const redirectTo = typeof window !== "undefined" ? window.location.href : "/";
  return (
    <button onClick={() => void signIn("google", {redirectTo: redirectTo})}>Sign in with Google</button>
  );
}
 
export function SignOut() {
  const { signOut } = useAuthActions();
  return <button onClick={() => void signOut()}>Sign out</button>;
}