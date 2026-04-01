"use client"

import { useEffect } from "react"
import Login from "./login"

export default function Page() {
  useEffect(() => {
    const handlepageshow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        window.location.reload()
      }
    }
    
    window.addEventListener('pageshow', handlepageshow)
    return () => window.removeEventListener('pageshow', handlepageshow)
  }, [])
  
  return <Login />
}