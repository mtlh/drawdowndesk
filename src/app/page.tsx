"use client"

import { useEffect } from "react"
import Login from "./login"

let listenersAdded = false

function addBackForwardListeners() {
  if (typeof window === 'undefined' || listenersAdded) return
  listenersAdded = true
  
  console.log('[Global] Adding back/forward listeners')
  
  window.addEventListener('popstate', () => {
    console.log('[Global] PopState - reloading')
    window.location.reload()
  })
  
  window.addEventListener('pageshow', (event: PageTransitionEvent) => {
    console.log('[Global] Pageshow - reloading (persisted:', event.persisted + ')')
    window.location.reload()
  })
}

if (typeof window !== 'undefined') {
  addBackForwardListeners()
}

export default function Page() {
  return <Login />
}