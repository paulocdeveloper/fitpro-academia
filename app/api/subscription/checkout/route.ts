import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/api/require-auth"
import { isUsuarioRole } from "@/lib/auth/roles"
import { signSessionToken } from "@/lib/auth/session-token"
import { AUTH_COOKIE } from "@/lib/auth/session"
import { activatePremiumSubscription, loadUserSubscription } from "@/lib/premium/subscription"
import { PREMIUM_PLAN } from "@/lib/premium/types"

type Body = {
  provider?: "mock" | "stripe" | "mercadopago"
}

/**
 * Checkout Premium — estrutura pronta para Stripe / Mercado Pago.
 * Sem chaves de gateway: ativa assinatura mock (30 dias) para validação.
 */
export async function POST(req: Request) {
  const auth = await requireAuth(req)
  if (!auth.ok) return auth.response

  if (!isUsuarioRole(auth.session.role)) {
    return NextResponse.json(
      { error: "Assinatura Premium disponível para contas fitness." },
      { status: 403 },
    )
  }

  let body: Body = {}
  try {
    body = (await req.json()) as Body
  } catch {
    /* body opcional */
  }

  const provider = body.provider ?? "mock"
  const hasStripe = Boolean(process.env.STRIPE_SECRET_KEY?.trim())
  const hasMp = Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN?.trim())

  if (provider === "stripe" && hasStripe) {
    return NextResponse.json({
      ok: false,
      error: "Integração Stripe em configuração. Use provider mock em desenvolvimento.",
      code: "STRIPE_PENDING",
      plan: PREMIUM_PLAN,
    }, { status: 501 })
  }

  if (provider === "mercadopago" && hasMp) {
    return NextResponse.json({
      ok: false,
      error: "Integração Mercado Pago em configuração. Use provider mock em desenvolvimento.",
      code: "MP_PENDING",
      plan: PREMIUM_PLAN,
    }, { status: 501 })
  }

  await activatePremiumSubscription(
    auth.session.userId,
    auth.session.academiaId,
    "mock",
    `mock_${Date.now()}`,
  )

  const token = await signSessionToken({
    userId: auth.session.userId,
    role: auth.session.role,
    email: auth.session.email,
    academiaId: auth.session.academiaId,
  })

  const res = NextResponse.json({
    ok: true,
    activated: true,
    provider: "mock",
    subscription: await loadUserSubscription(auth.session.userId, auth.session.role),
    plan: PREMIUM_PLAN,
    message: "Premium ativado por 30 dias. Em produção, o pagamento será via Stripe ou Mercado Pago.",
  })

  res.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  })

  return res
}
