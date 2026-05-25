import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/api/require-auth"
import { isUsuarioRole } from "@/lib/auth/roles"
import { signSessionToken } from "@/lib/auth/session-token"
import { AUTH_COOKIE } from "@/lib/auth/session"
import { loadUserSubscription } from "@/lib/premium/subscription"

/** Sincroniza status com Mercado Pago após retorno do checkout (polling). */
export async function POST(req: Request) {
  const auth = await requireAuth(req)
  if (!auth.ok) return auth.response

  if (!isUsuarioRole(auth.session.role)) {
    return NextResponse.json({ error: "Disponível para contas fitness." }, { status: 403 })
  }

  const subscription = await loadUserSubscription(auth.session.userId, auth.session.role, {
    syncMp: true,
  })

  const token = await signSessionToken({
    userId: auth.session.userId,
    role: auth.session.role,
    email: auth.session.email,
    academiaId: auth.session.academiaId,
  })

  const res = NextResponse.json({ ok: true, subscription })
  res.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  })
  return res
}
