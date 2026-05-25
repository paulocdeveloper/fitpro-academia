/** Rotas que exigem Premium Nutrição (role `usuario`). Sem dependência de DB — seguro no client. */
export const PREMIUM_NUTRITION_PREFIXES = ["/dietas", "/nutricao"] as const

export function isPremiumNutritionPath(pathname: string): boolean {
  return PREMIUM_NUTRITION_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  )
}

export function requiresPremiumForPath(pathname: string, role: string): boolean {
  return role === "usuario" && isPremiumNutritionPath(pathname)
}
