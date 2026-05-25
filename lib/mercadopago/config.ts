import { siteUrl } from "@/lib/seo/site"

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
