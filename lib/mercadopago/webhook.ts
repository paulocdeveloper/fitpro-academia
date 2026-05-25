import { createHmac, timingSafeEqual } from "crypto"
import { getMercadoPagoWebhookSecret } from "@/lib/mercadopago/config"

function parseSignatureHeader(header: string | null): { ts: string; v1: string } | null {
  if (!header) return null
  const parts = header.split(",").map((p) => p.trim())
  let ts = ""
  let v1 = ""
  for (const part of parts) {
    const [key, value] = part.split("=").map((s) => s.trim())
    if (key === "ts") ts = value ?? ""
    if (key === "v1") v1 = value ?? ""
  }
  if (!ts || !v1) return null
  return { ts, v1 }
}

/**
 * Valida notificação Mercado Pago (x-signature + data.id).
 * @see https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
 */
export function verifyMercadoPagoWebhookSignature(
  req: Request,
  dataId: string | null,
): boolean {
  const secret = getMercadoPagoWebhookSecret()
  if (!secret) return false

  const xSignature = req.headers.get("x-signature")
  const xRequestId = req.headers.get("x-request-id") ?? ""
  const parsed = parseSignatureHeader(xSignature)
  if (!parsed || !dataId) return false

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${parsed.ts};`
  const expected = createHmac("sha256", secret).update(manifest).digest("hex")

  try {
    const a = Buffer.from(expected, "utf8")
    const b = Buffer.from(parsed.v1, "utf8")
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

export type MercadoPagoWebhookPayload = {
  id?: number
  live_mode?: boolean
  type?: string
  action?: string
  data?: { id?: string }
  entity?: string
  date_created?: string
}
