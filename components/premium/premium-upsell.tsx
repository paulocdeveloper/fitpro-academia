"use client"

import { useState } from "react"
import Link from "next/link"
import { Sparkles, Salad, ScanLine, Brain, Check, Crown, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  BILLING_PLANS,
  computeSavingsPercent,
  getBillingPlanBadgeLabel,
  type BillingPlan,
  type BillingPlanSlug,
} from "@/lib/premium/billing-plans"

const FEATURES = [
  { icon: Salad, text: "Nutrição e plano alimentar" },
  { icon: ScanLine, text: "Scanner alimentar com câmera" },
  { icon: Brain, text: "Análise nutricional com IA Vision" },
]

function PlanCard({
  plan,
  loading,
  onSubscribe,
}: {
  plan: BillingPlan
  loading: boolean
  onSubscribe: (slug: BillingPlanSlug) => void
}) {
  const savings = computeSavingsPercent(plan)
  const isHighlighted = plan.badge === "popular" || plan.badge === "best"

  return (
    <article
      className={`relative flex flex-col rounded-2xl border p-5 sm:p-6 text-left transition-all ${
        isHighlighted
          ? "border-primary/60 bg-card shadow-[0_0_24px_oklch(0.7_0.22_145_/_0.12)] scale-[1.02] sm:scale-105 z-10"
          : "border-border/50 bg-card/80"
      }`}
    >
      {plan.badge && (
        <div
          className={`absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap ${
            plan.badge === "popular"
              ? "bg-primary text-primary-foreground neon-glow"
              : "bg-amber-500 text-black"
          }`}
        >
          {plan.badge === "popular" ? (
            <Star className="h-3 w-3 fill-current" />
          ) : (
            <Crown className="h-3 w-3 fill-current" />
          )}
          {getBillingPlanBadgeLabel(plan.badge)}
        </div>
      )}

      <div className={`space-y-1 ${plan.badge ? "pt-2" : ""}`}>
        <h2
          className="text-lg font-bold"
          style={{ fontFamily: "var(--font-space-grotesk)" }}
        >
          {plan.name}
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed min-h-[2.5rem]">
          {plan.description}
        </p>
      </div>

      <div className="mt-4 mb-1">
        <p
          className={`text-2xl sm:text-3xl font-bold ${isHighlighted ? "neon-text" : ""}`}
          style={{ fontFamily: "var(--font-space-grotesk)" }}
        >
          {plan.billingLabel}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{plan.recurringLabel}</p>
      </div>

      {savings !== null && savings > 0 && (
        <span className="inline-flex self-start items-center rounded-md bg-primary/15 text-primary text-xs font-semibold px-2 py-0.5 mb-4">
          Economize {savings}%
        </span>
      )}

      {!savings && <div className="mb-4" />}

      <Button
        type="button"
        size="lg"
        disabled={loading}
        onClick={() => onSubscribe(plan.slug)}
        className={`w-full h-11 font-semibold mt-auto ${
          isHighlighted ? "neon-glow" : ""
        }`}
        style={
          isHighlighted
            ? { background: "var(--primary)", color: "var(--primary-foreground)" }
            : undefined
        }
        variant={isHighlighted ? "default" : "outline"}
      >
        {loading ? (
          <span className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          "Assinar Agora"
        )}
      </Button>
    </article>
  )
}

export function PremiumUpsell() {
  const [loadingPlan, setLoadingPlan] = useState<BillingPlanSlug | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function assinar(planSlug: BillingPlanSlug) {
    setError(null)
    setLoadingPlan(planSlug)
    try {
      const res = await fetch("/api/subscription/checkout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "mercadopago", plan: planSlug }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Não foi possível iniciar o pagamento.")
        return
      }
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl as string
        return
      }
      if (data.activated) {
        window.location.href = "/dietas"
        return
      }
      setError("Resposta de checkout inválida.")
    } catch {
      setError("Erro de conexão.")
    } finally {
      setLoadingPlan(null)
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4 md:p-8 min-h-[60vh]">
      <div className="w-full max-w-5xl space-y-8 text-center">
        <div className="space-y-4">
          <div
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl neon-glow"
            style={{ background: "var(--primary)" }}
          >
            <Sparkles className="h-7 w-7" style={{ color: "var(--primary-foreground)" }} />
          </div>

          <div className="space-y-3">
            <h1
              className="text-2xl sm:text-3xl font-bold leading-tight"
              style={{ fontFamily: "var(--font-space-grotesk)" }}
            >
              Desbloqueie o FitPro Premium
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed max-w-lg mx-auto">
              Nutrição inteligente com IA, scanner alimentar e análise completa.
              Escolha o plano ideal para você.
            </p>
          </div>
        </div>

        <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2 max-w-2xl mx-auto text-sm">
          {FEATURES.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-2">
              <Check className="h-4 w-4 shrink-0 text-primary" />
              <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span>{text}</span>
            </li>
          ))}
        </ul>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-4 lg:gap-6 items-stretch pt-2">
          {BILLING_PLANS.map((plan) => (
            <PlanCard
              key={plan.slug}
              plan={plan}
              loading={loadingPlan === plan.slug}
              onSubscribe={assinar}
            />
          ))}
        </div>

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 max-w-md mx-auto">
            {error}
          </p>
        )}

        <p className="text-xs text-muted-foreground max-w-lg mx-auto">
          Pagamento seguro via Mercado Pago. Renovação automática conforme o plano escolhido —
          cancele quando quiser em Minha assinatura.
        </p>

        <Link
          href="/treino-inteligente"
          className="text-sm text-muted-foreground hover:underline inline-block"
        >
          Continuar no plano gratuito
        </Link>
      </div>
    </div>
  )
}
