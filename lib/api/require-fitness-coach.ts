import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/api/require-auth"
import { isFitnessRole, isStaffRole, isUsuarioRole } from "@/lib/auth/roles"
import { hasNutritionAccess, hasWorkoutAccess, WORKOUT_BLOCKED_MESSAGE } from "@/lib/premium/plan-access"
import { loadUserSubscription } from "@/lib/premium/subscription"
import { PREMIUM_PLAN } from "@/lib/premium/types"

/** Coach IA: staff sempre; aluno fitness sempre; usuário B2C exige Premium. */
export async function requireFitnessCoach(req: Request) {
  const auth = await requireAuth(req)
  if (!auth.ok) return auth

  if (isStaffRole(auth.session.role)) {
    return { ok: true as const, session: auth.session }
  }

  if (isFitnessRole(auth.session.role)) {
    if (isUsuarioRole(auth.session.role)) {
      const subscription = await loadUserSubscription(auth.session.userId, auth.session.role)
      if (!hasWorkoutAccess(auth.session.role, subscription.planType)) {
        return {
          ok: false as const,
          response: NextResponse.json(
            {
              error: WORKOUT_BLOCKED_MESSAGE,
              code: "WORKOUT_PLAN_BLOCKED",
              upgradeUrl: "/premium",
            },
            { status: 403 },
          ),
        }
      }
      if (!hasNutritionAccess(auth.session.role, subscription.planType, subscription.isPremium)) {
        return {
          ok: false as const,
          response: NextResponse.json(
            {
              error: "FitPro Premium necessário para o Coach IA.",
              code: "PREMIUM_REQUIRED",
              plan: PREMIUM_PLAN,
              upgradeUrl: "/premium",
            },
            { status: 402 },
          ),
        }
      }
    }
    return { ok: true as const, session: auth.session }
  }

  return {
    ok: false as const,
    response: NextResponse.json({ error: "Acesso negado." }, { status: 403 }),
  }
}
