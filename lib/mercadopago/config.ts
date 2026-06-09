import { siteUrl } from "@/lib/seo/site"
import type { BillingPlanSlug } from "@/lib/premium/billing-plans"

export function getMercadoPagoAccessToken(): string | null {
  return process.env.MERCADOPAGO_ACCESS_TOKEN?.trim() || null
}

export function getMercadoPagoWebhookSecret(): string | null {
  return process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim() || null
}

export function isMercadoPagoConfigured(): boolean {
  return Boolean(getMercadoPagoAccessToken())
}

export function mercadoPagoApiBase(): string {
  return "https://api.mercadopago.com"
}

export function subscriptionBackUrls() {
  const base = siteUrl.replace(/\/$/, "")
  return {
    success: `${base}/minha-assinatura?checkout=success`,
    failure: `${base}/minha-assinatura?checkout=failure`,
    back: `${base}/minha-assinatura`,
  }
}

/** IDs de planos criados no painel Mercado Pago (opcional). */
export function getMercadoPagoPlanId(slug: BillingPlanSlug): string | null {
  const envMap: Record<BillingPlanSlug, string | undefined> = {
    mensal: process.env.MERCADOPAGO_PLAN_ID_MENSAL,
    semestral: process.env.MERCADOPAGO_PLAN_ID_SEMESTRAL,
    anual: process.env.MERCADOPAGO_PLAN_ID_ANUAL,
  }
  return envMap[slug]?.trim() || null
}
