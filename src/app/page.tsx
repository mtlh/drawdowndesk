"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Login from "./login"

export default function Page() {
  const router = useRouter()
  
  useEffect(() => {
    const handlePopState = () => {
      window.location.reload()
    }
    
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [router])
  
  return <Login />
}