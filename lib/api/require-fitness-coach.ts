import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/api/require-auth"
import { isFitnessRole, isStaffRole, isUsuarioRole } from "@/lib/auth/roles"
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
      if (!subscription.isPremium) {
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
