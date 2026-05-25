"use client"

import { useEffect, useState } from "react"
import { PremiumUpsell } from "@/components/premium/premium-upsell"
import { useSessionUser } from "@/lib/hooks/use-session-user"
import { isUsuarioRole } from "@/lib/auth/roles"

export function PremiumGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useSessionUser()
  const [premium, setPremium] = useState<boolean | null>(null)

  useEffect(() => {
    if (loading) return
    if (!user) {
      setPremium(false)
      return
    }
    if (!isUsuarioRole(user.role)) {
      setPremium(true)
      return
    }
    void (async () => {
      try {
        const res = await fetch("/api/subscription/status", { credentials: "include" })
        const data = await res.json()
        setPremium(Boolean(data.subscription?.isPremium))
      } catch {
        setPremium(false)
      }
    })()
  }, [user, loading])

  if (loading || premium === null) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground animate-pulse">
        Carregando…
      </div>
    )
  }

  if (!premium) {
    return <PremiumUpsell />
  }

  return <>{children}</>
}
