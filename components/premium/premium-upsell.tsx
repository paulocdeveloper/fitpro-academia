"use client"

import { useState } from "react"
import Link from "next/link"
import { Sparkles, Salad, ScanLine, Brain, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PREMIUM_PLAN } from "@/lib/premium/types"

export function PremiumUpsell() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function assinar() {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch("/api/subscription/checkout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "mercadopago" }),
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
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4 md:p-8 min-h-[60vh]">
      <div className="w-full max-w-lg space-y-6 text-center">
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
          <p className="text-muted-foreground text-sm sm:text-base leading-relaxed max-w-md mx-auto">
            Nutrição inteligente com IA,
            <br />
            scanner alimentar e análise completa.
          </p>
          <p
            className="text-3xl sm:text-4xl font-bold neon-text"
            style={{ fontFamily: "var(--font-space-grotesk)" }}
          >
            R$ {PREMIUM_PLAN.priceBrl.toFixed(2).replace(".", ",")}/mês
          </p>
        </div>

        <ul className="text-left space-y-2 max-w-xs mx-auto text-sm">
          {[
            { icon: Salad, text: "Nutrição e plano alimentar" },
            { icon: ScanLine, text: "Scanner alimentar com câmera" },
            { icon: Brain, text: "Análise nutricional com IA Vision" },
          ].map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-2">
              <Check className="h-4 w-4 shrink-0 text-primary" />
              <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span>{text}</span>
            </li>
          ))}
        </ul>

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <Button
          type="button"
          size="lg"
          disabled={loading}
          onClick={assinar}
          className="w-full max-w-sm h-12 font-semibold gap-2 neon-glow"
          style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
        >
          {loading ? (
            <span className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            "Assinar Premium"
          )}
        </Button>

        <p className="text-xs text-muted-foreground">
          Pagamento seguro via Mercado Pago. Renovação automática mensal — cancele quando quiser em
          Minha assinatura.
        </p>

        <Link href="/treino-inteligente" className="text-sm text-muted-foreground hover:underline inline-block">
          Continuar no plano gratuito
        </Link>
      </div>
    </div>
  )
}
