"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Navbar } from "@/components/layout/navbar"
import { PremiumBadge } from "@/components/premium/premium-badge"
import { Button } from "@/components/ui/button"
import { PREMIUM_PLAN, type UserSubscription } from "@/lib/premium/types"
import { CreditCard, Sparkles, CalendarClock, AlertCircle } from "lucide-react"
import { toast } from "sonner"

const PAYMENT_LABELS: Record<string, string> = {
  none: "Sem pagamento",
  pending: "Aguardando pagamento",
  authorized: "Pagamento ativo",
  paused: "Pausado",
  cancelled: "Cancelado",
  rejected: "Recusado",
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

export function MinhaAssinaturaView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [subscription, setSubscription] = useState<UserSubscription | null>(null)

  const load = useCallback(async (sync = false) => {
    setLoading(true)
    try {
      const q = sync ? "?sync=1" : ""
      const res = await fetch(`/api/subscription/status${q}`, { credentials: "include" })
      const data = await res.json()
      if (data.subscription) setSubscription(data.subscription)
    } finally {
      setLoading(false)
    }
  }, [])

  const syncAfterCheckout = useCallback(async () => {
    setSyncing(true)
    try {
      const res = await fetch("/api/subscription/sync", {
        method: "POST",
        credentials: "include",
      })
      const data = await res.json()
      if (data.subscription) {
        setSubscription(data.subscription)
        if (data.subscription.isPremium) {
          toast.success("Premium ativado! Nutrição e scanner liberados.")
          router.replace("/minha-assinatura")
        } else {
          toast.message("Pagamento em processamento. Atualize em instantes.")
        }
      }
      router.refresh()
    } catch {
      toast.error("Não foi possível sincronizar a assinatura.")
    } finally {
      setSyncing(false)
    }
  }, [router])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const checkout = searchParams.get("checkout")
    if (checkout === "success") {
      void syncAfterCheckout()
    } else if (checkout === "failure") {
      toast.error("Pagamento não concluído. Tente novamente.")
    }
  }, [searchParams, syncAfterCheckout])

  async function cancelar() {
    if (!confirm("Cancelar assinatura? O acesso Premium termina ao fim do período pago.")) return
    setCancelling(true)
    try {
      const res = await fetch("/api/subscription/cancel", {
        method: "POST",
        credentials: "include",
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? "Erro ao cancelar.")
        return
      }
      setSubscription(data.subscription)
      toast.success("Assinatura cancelada.")
      router.refresh()
    } catch {
      toast.error("Erro de conexão.")
    } finally {
      setCancelling(false)
    }
  }

  const badgeVariant = subscription?.isPremium
    ? "premium"
    : subscription?.subscriptionStatus === "expired"
      ? "expired"
      : subscription?.subscriptionStatus === "cancelled"
        ? "cancelled"
        : "free"

  const expiresLabel = formatDate(subscription?.premiumExpiresAt)
  const nextBillingLabel = formatDate(subscription?.nextBillingAt)

  return (
    <>
      <Navbar title="Minha assinatura" subtitle="Plano FitPro Premium Nutrição" />
      <div className="flex-1 p-4 md:p-6 max-w-lg mx-auto w-full space-y-6">
        {searchParams.get("checkout") === "success" && syncing && (
          <p className="text-sm text-muted-foreground animate-pulse text-center">
            Confirmando pagamento com Mercado Pago…
          </p>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground animate-pulse">Carregando…</p>
        ) : (
          <>
            <div className="rounded-xl border border-border/50 bg-card p-5 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <span className="font-semibold">Status da assinatura</span>
                </div>
                <PremiumBadge variant={badgeVariant} />
              </div>

              <div className="space-y-2 text-sm">
                <p>
                  <span className="text-muted-foreground">Plano: </span>
                  {subscription?.isPremium ? PREMIUM_PLAN.name : "Gratuito (Fitness)"}
                </p>
                <p>
                  <span className="text-muted-foreground">Valor: </span>
                  R$ {PREMIUM_PLAN.priceBrl.toFixed(2).replace(".", ",")}/mês
                </p>
                {subscription?.paymentProvider && (
                  <p>
                    <span className="text-muted-foreground">Pagamento: </span>
                    Mercado Pago
                  </p>
                )}
                <p>
                  <span className="text-muted-foreground">Situação do pagamento: </span>
                  {PAYMENT_LABELS[subscription?.paymentStatus ?? "none"] ??
                    subscription?.paymentStatus}
                </p>
                {subscription?.isPremium && expiresLabel && (
                  <p>
                    <span className="text-muted-foreground">Acesso até: </span>
                    {expiresLabel}
                  </p>
                )}
                {subscription?.isPremium && nextBillingLabel && (
                  <p className="flex items-start gap-2">
                    <CalendarClock className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                    <span>
                      <span className="text-muted-foreground">Próxima cobrança: </span>
                      {nextBillingLabel}
                    </span>
                  </p>
                )}
                {subscription?.paymentStatus === "pending" && (
                  <p className="flex items-start gap-2 text-amber-600 dark:text-amber-400">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    Pagamento pendente. Conclua no Mercado Pago ou aguarde a confirmação.
                  </p>
                )}
                {!subscription?.isPremium && subscription?.subscriptionStatus === "expired" && (
                  <p className="text-muted-foreground">
                    Sua assinatura expirou. Renove para voltar a usar nutrição e scanner IA.
                  </p>
                )}
                {!subscription?.isPremium && subscription?.subscriptionStatus === "free" && (
                  <p className="text-muted-foreground">
                    Inclui exercícios, IA treino, evolução, agenda e perfil. Nutrição e scanner
                    exigem Premium.
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

            {subscription?.canCancel && (
              <div className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Ao cancelar, não haverá novas cobranças. O acesso Premium permanece até{" "}
                  {expiresLabel ?? "o fim do período"}.
                </p>
                <Button
                  variant="destructive"
                  className="w-full"
                  disabled={cancelling}
                  onClick={cancelar}
                >
                  {cancelling ? "Cancelando…" : "Cancelar assinatura"}
                </Button>
              </div>
            )}

            {subscription?.paymentStatus === "pending" && (
              <Button
                variant="outline"
                className="w-full"
                disabled={syncing}
                onClick={() => syncAfterCheckout()}
              >
                {syncing ? "Sincronizando…" : "Atualizar status do pagamento"}
              </Button>
            )}
          </>
        )}
      </div>
    </>
  )
}
