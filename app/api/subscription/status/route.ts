import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/api/require-auth"
import { loadUserSubscription } from "@/lib/premium/subscription"
import { PREMIUM_PLAN } from "@/lib/premium/types"

export async function GET(req: Request) {
  const auth = await requireAuth(req)
  if (!auth.ok) return auth.response

  const url = new URL(req.url)
  const syncMp = url.searchParams.get("sync") === "1"

  const subscription = await loadUserSubscription(auth.session.userId, auth.session.role, {
    syncMp,
  })

  return NextResponse.json({
    ok: true,
    subscription,
    plan: PREMIUM_PLAN,
    checkout: {
      mercadopago: Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN?.trim()),
      mockDev:
        process.env.NODE_ENV !== "production" &&
        process.env.MERCADOPAGO_USE_MOCK === "true",
    },
  })
}
