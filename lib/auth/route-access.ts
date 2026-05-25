import type { UserRole } from "@/lib/auth/roles"
import { isStaffRole } from "@/lib/auth/roles"

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

/** Rotas permitidas ao perfil aluno. */
export const ALUNO_ALLOWED_PREFIXES = [
  "/treino-inteligente",
  "/exercicios",
  "/dietas",
  "/agenda",
] as const

export const ALUNO_HOME = "/treino-inteligente"
export const STAFF_HOME = "/dashboard"

export function defaultHomeForRole(role: UserRole): string {
  return isStaffRole(role) ? STAFF_HOME : ALUNO_HOME
}

export function pathnameAllowedForRole(pathname: string, role: UserRole): boolean {
  if (isStaffRole(role)) return true
  if (pathname === "/cadastro") return false
  return ALUNO_ALLOWED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  )
}

export function redirectForForbiddenPath(pathname: string, role: UserRole): string | null {
  if (isStaffRole(role)) return null
  if (pathnameAllowedForRole(pathname, role)) return null
  return ALUNO_HOME
}
