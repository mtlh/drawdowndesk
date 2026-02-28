import { useEffect } from "react"

/**
 * Hook to lock body scroll when a condition is true.
 * Automatically restores scroll on unmount.
 */
export function useBodyScrollLock(lock: boolean) {
  useEffect(() => {
    if (lock) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }

    return () => {
      document.body.style.overflow = "unset"
    }
  }, [lock])
}
