"use client"

import { usePathname } from "next/navigation"
import Login from "./login"

export default function Page() {
  const pathname = usePathname()
  
  return <Login key={pathname} />;
}