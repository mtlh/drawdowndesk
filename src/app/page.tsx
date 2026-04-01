"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Login from "./login"

export default function Page() {
  const router = useRouter()
  
  useEffect(() => {
    console.log('[Page] Mounted, adding event listeners')
    
    const handlePopState = () => {
      console.log('[Page] PopState event fired - reloading')
      window.location.reload()
    }
    
    const handlePageshow = (event: PageTransitionEvent) => {
      console.log('[Page] Pageshow event fired, persisted:', event.persisted)
      window.location.reload()
    }
    
    window.addEventListener('popstate', handlePopState)
    window.addEventListener('pageshow', handlePageshow)
    
    return () => {
      console.log('[Page] Unmounting, removing event listeners')
      window.removeEventListener('popstate', handlePopState)
      window.removeEventListener('pageshow', handlePageshow)
    }
  }, [router])
  
  return <Login />
}