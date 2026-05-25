"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Navbar } from "@/components/layout/navbar"
import { PremiumBadge } from "@/components/premium/premium-badge"
import { Button } from "@/components/ui/button"
import { PREMIUM_PLAN, type UserSubscription } from "@/lib/premium/types"
import { CreditCard, Sparkles } from "lucide-react"

export function MinhaAssinaturaView() {
  const [loading, setLoading] = useState(true)
  const [subscription, setSubscription] = useState<UserSubscription | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/subscription/status", { credentials: "include" })
      const data = await res.json()
      if (data.subscription) setSubscription(data.subscription)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const expiresLabel = subscription?.premiumExpiresAt
    ? new Date(subscription.premiumExpiresAt).toLocaleDateString("pt-BR")
    : null

  return (
    <>
      <Navbar title="Minha assinatura" subtitle="Plano FitPro Premium Nutrição" />
      <div className="flex-1 p-4 md:p-6 max-w-lg mx-auto w-full space-y-6">
        {loading ? (
          <p className="text-sm text-muted-foreground animate-pulse">Carregando…</p>
        ) : (
          <div className="rounded-xl border border-border/50 bg-card p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                <span className="font-semibold">Status</span>
              </div>
              <PremiumBadge variant={subscription?.isPremium ? "premium" : "free"} />
            </div>

            <div className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Plano: </span>
                {subscription?.isPremium ? PREMIUM_PLAN.name : "Gratuito (Fitness)"}
              </p>
              {subscription?.isPremium && expiresLabel && (
                <p>
                  <span className="text-muted-foreground">Válido até: </span>
                  {expiresLabel}
                </p>
              )}
              {!subscription?.isPremium && (
                <p className="text-muted-foreground">
                  Inclui exercícios, IA treino, evolução, agenda e perfil. Nutrição e scanner exigem
                  Premium.
                </p>
              )}
            </div>

            {!subscription?.isPremium ? (
              <Button
                asChild
                className="w-full gap-2 font-semibold"
                style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
              >
                <Link href="/premium">
                  <Sparkles className="h-4 w-4" />
                  Assinar por R$ {PREMIUM_PLAN.priceBrl.toFixed(2).replace(".", ",")}/mês
                </Link>
              </Button>
            ) : (
              <Button variant="outline" asChild className="w-full">
                <Link href="/dietas">Abrir Nutrição Premium</Link>
              </Button>
            )}
          </div>
        )}
      </div>
    </>
  )
}
