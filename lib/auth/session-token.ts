import { signAccessToken, type JwtPayloadUser } from "@/lib/auth/jwt"
import type { UserRole } from "@/lib/auth/roles"
import { loadUserSubscription } from "@/lib/premium/subscription"

export async function signSessionToken(input: {
  userId: number
  role: UserRole
  email: string
  academiaId: number
}): Promise<string> {
  const sub = await loadUserSubscription(input.userId, input.role)
  const payload: JwtPayloadUser = {
    ...input,
    isPremium: sub.isPremium,
    subscriptionStatus: sub.subscriptionStatus,
    planType: sub.planType,
  }
  return signAccessToken(payload)
}
