import { NextResponse } from "next/server"
import { requireAuth, type AuthResult } from "@/lib/api/require-auth"
import { isUsuarioRole } from "@/lib/auth/roles"
import { hasNutritionAccess } from "@/lib/premium/plan-access"
import { loadUserSubscription } from "@/lib/premium/subscription"
import { PREMIUM_PLAN } from "@/lib/premium/types"

export type PremiumAuthSuccess = AuthResult & { ok: true; subscription: Awaited<ReturnType<typeof loadUserSubscription>> }

export async function requirePremiumNutrition(req: Request): Promise<
  | PremiumAuthSuccess
  | { ok: false; response: NextResponse }
> {
  const auth = await requireAuth(req)
  if (!auth.ok) return auth

  if (!isUsuarioRole(auth.session.role)) {
    return { ok: true, session: auth.session, subscription: await loadUserSubscription(auth.session.userId, auth.session.role) }
  }

  const subscription = await loadUserSubscription(auth.session.userId, auth.session.role)
  if (!hasNutritionAccess(auth.session.role, subscription.planType, subscription.isPremium)) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "FitPro Premium necessário para nutrição e scanner IA.",
          code: "PREMIUM_REQUIRED",
          plan: PREMIUM_PLAN,
          upgradeUrl: "/premium",
        },
        { status: 402 },
      ),
    }
  }

  return { ok: true, session: auth.session, subscription }
}
