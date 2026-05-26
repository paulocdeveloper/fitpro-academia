import { NextResponse } from "next/server"
import { getMercadoPagoWebhookSecret, isMercadoPagoConfigured } from "@/lib/mercadopago/config"
import {
  syncMercadoPagoAuthorizedPayment,
  syncMercadoPagoPreapproval,
} from "@/lib/premium/mercadopago-sync"
import {
  verifyMercadoPagoWebhookSignature,
  type MercadoPagoWebhookPayload,
} from "@/lib/mercadopago/webhook"

async function processNotification(type: string | null, dataId: string | null) {
  if (!dataId || !isMercadoPagoConfigured()) return

  if (type === "subscription_preapproval" || type === "preapproval") {
    await syncMercadoPagoPreapproval(dataId)
    return
  }

  if (type === "subscription_authorized_payment" || type === "authorized_payment") {
    await syncMercadoPagoAuthorizedPayment(dataId)
    return
  }

  if (type === "payment") {
    await syncMercadoPagoAuthorizedPayment(dataId)
  }
}

function extractDataId(payload: MercadoPagoWebhookPayload, url: URL): string | null {
  return payload.data?.id ?? url.searchParams.get("data.id") ?? url.searchParams.get("id")
}

function extractType(payload: MercadoPagoWebhookPayload, url: URL): string | null {
  return payload.type ?? url.searchParams.get("type") ?? url.searchParams.get("topic")
}

export async function POST(req: Request) {
  const url = new URL(req.url)
  let payload: MercadoPagoWebhookPayload = {}

  try {
    const text = await req.text()
    if (text) payload = JSON.parse(text) as MercadoPagoWebhookPayload
  } catch {
    /* body vazio */
  }

  const dataId = extractDataId(payload, url)
  const type = extractType(payload, url)

  console.info("[mp:webhook]", {
    method: "POST",
    type,
    dataId,
    action: payload.action ?? null,
    live_mode: payload.live_mode ?? null,
  })

  if (getMercadoPagoWebhookSecret()) {
    if (!verifyMercadoPagoWebhookSignature(req, dataId)) {
      console.warn("webhook MP: assinatura inválida", { type, dataId })
      return NextResponse.json({ error: "Assinatura inválida." }, { status: 401 })
    }
  } else if (process.env.NODE_ENV === "production") {
    console.warn("webhook MP: MERCADOPAGO_WEBHOOK_SECRET ausente em produção")
    return NextResponse.json({ error: "Webhook secret não configurado." }, { status: 503 })
  }

  try {
    await processNotification(type, dataId)
    console.info("[mp:webhook] processed", { type, dataId })
  } catch (e) {
    console.error("[mp:webhook] process error", { type, dataId, error: e })
  }

  return NextResponse.json({ ok: true }, { status: 200 })
}

/** IPN legado (query string). */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const dataId = url.searchParams.get("data.id") ?? url.searchParams.get("id")
  const type = url.searchParams.get("type") ?? url.searchParams.get("topic")

  if (getMercadoPagoWebhookSecret() && dataId) {
    if (!verifyMercadoPagoWebhookSignature(req, dataId)) {
      return NextResponse.json({ error: "Assinatura inválida." }, { status: 401 })
    }
  }

  try {
    await processNotification(type, dataId)
  } catch (e) {
    console.error("webhook MP GET", e)
  }

  return NextResponse.json({ ok: true }, { status: 200 })
}
