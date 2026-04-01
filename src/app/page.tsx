"use client"

import { useEffect } from "react"
import Login from "./login"

export default function Page() {
  useEffect(() => {
    window.addEventListener('pageshow', () => {
      window.location.reload()
    })
  }, [])
  
  return <Login />
}