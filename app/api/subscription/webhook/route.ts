import { NextResponse } from "next/server"

/**
 * Webhook Stripe / Mercado Pago (placeholder).
 * Configure STRIPE_WEBHOOK_SECRET ou MERCADOPAGO_WEBHOOK_SECRET no Render.
 */
export async function POST(req: Request) {
  const provider = req.headers.get("x-fitpro-provider") ?? "unknown"

  if (provider === "stripe" && process.env.STRIPE_WEBHOOK_SECRET?.trim()) {
    return NextResponse.json({ ok: false, error: "Handler Stripe pendente." }, { status: 501 })
  }

  if (provider === "mercadopago" && process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim()) {
    return NextResponse.json({ ok: false, error: "Handler Mercado Pago pendente." }, { status: 501 })
  }

  return NextResponse.json(
    { error: "Webhook não configurado. Use checkout mock em desenvolvimento." },
    { status: 501 },
  )
}
