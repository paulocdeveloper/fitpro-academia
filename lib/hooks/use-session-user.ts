"use client"

import { useEffect, useState } from "react"
import type { UserRole } from "@/lib/auth/roles"

export type SessionUser = {
  id: number
  role: UserRole
  academiaId: number
  displayName: string
  roleLabel: string
  initials: string
  isPremium?: boolean
  subscriptionStatus?: string
  planType?: string
  premiumExpiresAt?: string | null
}

export function useSessionUser() {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" })
        if (!res.ok) {
          if (!cancelled) setUser(null)
          return
        }
        const data = (await res.json()) as { user?: SessionUser }
        if (!cancelled && data.user) setUser(data.user)
      } catch {
        if (!cancelled) setUser(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return { user, loading }
}
