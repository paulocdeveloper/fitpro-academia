import type { UserRole } from "@/lib/auth/roles"
import { isAlunoRole, isStaffRole, isUsuarioRole } from "@/lib/auth/roles"
import { isPremiumNutritionPath } from "@/lib/premium/paths"
import { PREMIUM_PUBLIC_PATHS } from "@/lib/premium/routes"

/** Rotas exclusivas de gestão (admin/personal). */
export const STAFF_ONLY_PREFIXES = [
  "/dashboard",
  "/alunos",
  "/treinos",
  "/financeiro",
  "/planos",
  "/estoque",
  "/configuracoes",
] as const

/** Rotas permitidas ao aluno (criado pelo admin da academia). */
export const ALUNO_ALLOWED_PREFIXES = [
  "/treino-inteligente",
  "/exercicios",
  "/dietas",
  "/coach-ia",
  "/agenda",
] as const

/** Usuário fitness FREE (sem nutrição premium). */
export const USUARIO_FREE_PREFIXES = [
  "/treino-inteligente",
  "/exercicios",
  "/agenda",
  "/evolucao",
  "/perfil",
  "/premium",
  "/minha-assinatura",
] as const

/** Nutrição — apenas com Premium ativo. */
export const USUARIO_PREMIUM_PREFIXES = ["/dietas", "/nutricao", "/coach-ia"] as const

export const ALUNO_HOME = "/treino-inteligente"
export const USUARIO_HOME = "/treino-inteligente"
export const STAFF_HOME = "/dashboard"
export const PREMIUM_UPSELL_PATH = "/premium"

export function defaultHomeForRole(role: UserRole): string {
  if (isStaffRole(role)) return STAFF_HOME
  if (isUsuarioRole(role)) return USUARIO_HOME
  return ALUNO_HOME
}

function usuarioPathAllowed(pathname: string, isPremium: boolean): boolean {
  if (PREMIUM_PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return true
  }
  if (isPremiumNutritionPath(pathname)) {
    return isPremium
  }
  return USUARIO_FREE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

function allowedPrefixesForRole(role: UserRole): readonly string[] {
  if (isStaffRole(role)) return []
  if (isUsuarioRole(role)) return USUARIO_FREE_PREFIXES
  if (isAlunoRole(role)) return ALUNO_ALLOWED_PREFIXES
  return ALUNO_ALLOWED_PREFIXES
}

export function pathnameAllowedForRole(
  pathname: string,
  role: UserRole,
  isPremium = false,
): boolean {
  if (isStaffRole(role)) return true
  if (pathname === "/cadastro" || pathname === "/cadastro-fitness") return false
  if (isUsuarioRole(role)) return usuarioPathAllowed(pathname, isPremium)
  const prefixes = allowedPrefixesForRole(role)
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

export function redirectForForbiddenPath(
  pathname: string,
  role: UserRole,
  isPremium = false,
): string | null {
  if (isStaffRole(role)) return null
  if (pathnameAllowedForRole(pathname, role, isPremium)) return null
  if (isUsuarioRole(role) && isPremiumNutritionPath(pathname) && !isPremium) {
    return PREMIUM_UPSELL_PATH
  }
  return defaultHomeForRole(role)
}
