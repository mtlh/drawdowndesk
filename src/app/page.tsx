"use client"

import Login from "./login"

let listenersAdded = false
let lastReloadTime = 0

function addBackForwardListeners() {
  if (typeof window === 'undefined' || listenersAdded) return
  listenersAdded = true
  
  console.log('[Global] Adding back/forward listeners')
  
  window.addEventListener('pageshow', (event: PageTransitionEvent) => {
    console.log('[Global] Pageshow - persisted:', event.persisted)
    const now = Date.now()
    if (now - lastReloadTime > 1000) {
      console.log('[Global] Reloading due to pageshow')
      lastReloadTime = now
      window.location.reload()
    }
  })
}

if (typeof window !== 'undefined') {
  addBackForwardListeners()
}

export default function Page() {
  return <Login />
}