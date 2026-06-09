import { hasNutritionAccess } from "@/lib/premium/plan-access"
import type { UserRole } from "@/lib/auth/roles"

/** Rotas que exigem acesso à nutrição (role `usuario`). Sem dependência de DB — seguro no client. */
export const PREMIUM_NUTRITION_PREFIXES = ["/dietas", "/nutricao"] as const

export function isPremiumNutritionPath(pathname: string): boolean {
  return PREMIUM_NUTRITION_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  )
}

export function requiresPremiumForPath(pathname: string, role: string): boolean {
  return role === "usuario" && isPremiumNutritionPath(pathname)
}

export function requiresNutritionAccess(
  pathname: string,
  role: UserRole,
  planType: string | null | undefined,
  isPremium: boolean,
): boolean {
  return requiresPremiumForPath(pathname, role) && !hasNutritionAccess(role, planType, isPremium)
}
