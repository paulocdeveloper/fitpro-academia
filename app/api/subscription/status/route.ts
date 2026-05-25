import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/api/require-auth"
import { loadUserSubscription } from "@/lib/premium/subscription"
import { PREMIUM_PLAN } from "@/lib/premium/types"

export async function GET(req: Request) {
  const auth = await requireAuth(req)
  if (!auth.ok) return auth.response

  const subscription = await loadUserSubscription(auth.session.userId, auth.session.role)

  return NextResponse.json({
    ok: true,
    subscription,
    plan: PREMIUM_PLAN,
    providers: {
      stripe: Boolean(process.env.STRIPE_SECRET_KEY?.trim()),
      mercadopago: Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN?.trim()),
    },
  })
}
