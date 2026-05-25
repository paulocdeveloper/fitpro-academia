import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/api/require-auth"
import { isUsuarioRole } from "@/lib/auth/roles"
import { MercadoPagoApiError } from "@/lib/mercadopago/client"
import { isMercadoPagoConfigured } from "@/lib/mercadopago/config"
import { createPendingPreapproval } from "@/lib/mercadopago/preapproval"
import { setUserPaymentPending } from "@/lib/premium/subscription-store"
import {
  activatePremiumSubscriptionMock,
  loadUserSubscription,
} from "@/lib/premium/subscription"
import { PREMIUM_PLAN } from "@/lib/premium/types"

type Body = {
  provider?: "mock" | "mercadopago"
}

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

  const useMock =
    body.provider === "mock" ||
    (process.env.MERCADOPAGO_USE_MOCK === "true" && !isMercadoPagoConfigured())

  if (useMock && process.env.NODE_ENV !== "production") {
    const subscription = await activatePremiumSubscriptionMock(
      auth.session.userId,
      auth.session.academiaId,
    )
    const { signSessionToken } = await import("@/lib/auth/session-token")
    const { AUTH_COOKIE } = await import("@/lib/auth/session")
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
      subscription,
      plan: PREMIUM_PLAN,
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

  if (!isMercadoPagoConfigured()) {
    return NextResponse.json(
      {
        error: "Pagamento não configurado. Defina MERCADOPAGO_ACCESS_TOKEN no servidor.",
        code: "MP_NOT_CONFIGURED",
      },
      { status: 503 },
    )
  }

  try {
    const { preapprovalId, checkoutUrl } = await createPendingPreapproval({
      userId: auth.session.userId,
      academiaId: auth.session.academiaId,
      payerEmail: auth.session.email,
    })

    await setUserPaymentPending({
      userId: auth.session.userId,
      subscriptionId: preapprovalId,
      paymentStatus: "pending",
    })

    return NextResponse.json({
      ok: true,
      provider: "mercadopago",
      checkoutUrl,
      preapprovalId,
      plan: PREMIUM_PLAN,
      subscription: await loadUserSubscription(auth.session.userId, auth.session.role),
    })
  } catch (e) {
    console.error("POST /api/subscription/checkout", e)
    if (e instanceof MercadoPagoApiError) {
      return NextResponse.json(
        { error: e.message, code: "MP_CHECKOUT_ERROR", details: e.body },
        { status: e.status >= 400 && e.status < 600 ? e.status : 502 },
      )
    }
    return NextResponse.json({ error: "Falha ao iniciar checkout Mercado Pago." }, { status: 500 })
  }
}
