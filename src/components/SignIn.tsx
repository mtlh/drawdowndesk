"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "./ui/button";
 
export function SignIn() {
  const { signIn } = useAuthActions();
  const redirectTo = typeof window !== "undefined" ? window.location.href : "/";
  return (
    <Button onClick={() => void signIn("google", {redirectTo: redirectTo})}>Sign in with Google</Button>
  );
}
 
export function SignOut() {
  const { signOut } = useAuthActions();
  return <Button onClick={() => void signOut()}>Sign out</Button>;
}