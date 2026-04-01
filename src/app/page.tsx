"use client"

import Login from "./login"

let listenersAdded = false

function addBackForwardListeners() {
  if (typeof window === 'undefined' || listenersAdded) return
  listenersAdded = true
  
  console.log('[Global] Adding back/forward listeners')
  
  window.addEventListener('popstate', () => {
    console.log('[Global] PopState - navigating')
    window.location.href = window.location.href
  })
  
  window.addEventListener('pageshow', (event: PageTransitionEvent) => {
    console.log('[Global] Pageshow - navigating (persisted:', event.persisted + ')')
    window.location.href = window.location.href
  })
}

if (typeof window !== 'undefined') {
  addBackForwardListeners()
}

export default function Page() {
  return <Login />
}