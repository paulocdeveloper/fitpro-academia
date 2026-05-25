import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/api/require-auth"
import { isUsuarioRole } from "@/lib/auth/roles"
import { signSessionToken } from "@/lib/auth/session-token"
import { AUTH_COOKIE } from "@/lib/auth/session"
import { cancelMercadoPagoSubscriptionForUser } from "@/lib/premium/mercadopago-sync"
import { loadUserSubscription } from "@/lib/premium/subscription"

export async function POST(req: Request) {
  const auth = await requireAuth(req)
  if (!auth.ok) return auth.response

  if (!isUsuarioRole(auth.session.role)) {
    return NextResponse.json({ error: "Disponível para contas fitness." }, { status: 403 })
  }

  const sub = await loadUserSubscription(auth.session.userId, auth.session.role)
  if (!sub.subscriptionId && !sub.isPremium) {
    return NextResponse.json({ error: "Nenhuma assinatura ativa para cancelar." }, { status: 400 })
  }

  await cancelMercadoPagoSubscriptionForUser(auth.session.userId)

  const token = await signSessionToken({
    userId: auth.session.userId,
    role: auth.session.role,
    email: auth.session.email,
    academiaId: auth.session.academiaId,
  })

  const res = NextResponse.json({
    ok: true,
    cancelled: true,
    subscription: await loadUserSubscription(auth.session.userId, auth.session.role),
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
