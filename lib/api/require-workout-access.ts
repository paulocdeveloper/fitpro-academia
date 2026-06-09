import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/api/require-auth"
import { loadUserSubscription } from "@/lib/premium/subscription"
import { hasWorkoutAccess, WORKOUT_BLOCKED_MESSAGE } from "@/lib/premium/plan-access"

export async function requireWorkoutAccess(req: Request) {
  const auth = await requireAuth(req)
  if (!auth.ok) return auth

  const subscription = await loadUserSubscription(auth.session.userId, auth.session.role)
  if (!hasWorkoutAccess(auth.session.role, subscription.planType)) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          error: WORKOUT_BLOCKED_MESSAGE,
          code: "WORKOUT_PLAN_BLOCKED",
          planType: subscription.planType,
          upgradeUrl: "/premium",
        },
        { status: 403 },
      ),
    }
  }

  return { ok: true as const, session: auth.session, subscription }
}
