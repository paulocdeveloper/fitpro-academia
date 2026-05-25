import type { UserRole } from "@/lib/auth/roles"
import { isAlunoRole, isStaffRole, isUsuarioRole } from "@/lib/auth/roles"

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
  "/agenda",
] as const

/** Rotas permitidas ao usuário fitness (auto-cadastro). */
export const USUARIO_ALLOWED_PREFIXES = [
  "/treino-inteligente",
  "/exercicios",
  "/dietas",
  "/agenda",
  "/evolucao",
  "/perfil",
] as const

export const ALUNO_HOME = "/treino-inteligente"
export const USUARIO_HOME = "/treino-inteligente"
export const STAFF_HOME = "/dashboard"

export function defaultHomeForRole(role: UserRole): string {
  if (isStaffRole(role)) return STAFF_HOME
  if (isUsuarioRole(role)) return USUARIO_HOME
  return ALUNO_HOME
}

function allowedPrefixesForRole(role: UserRole): readonly string[] {
  if (isStaffRole(role)) return []
  if (isUsuarioRole(role)) return USUARIO_ALLOWED_PREFIXES
  if (isAlunoRole(role)) return ALUNO_ALLOWED_PREFIXES
  return ALUNO_ALLOWED_PREFIXES
}

export function pathnameAllowedForRole(pathname: string, role: UserRole): boolean {
  if (isStaffRole(role)) return true
  if (pathname === "/cadastro" || pathname === "/cadastro-fitness") return false
  const prefixes = allowedPrefixesForRole(role)
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

export function redirectForForbiddenPath(pathname: string, role: UserRole): string | null {
  if (isStaffRole(role)) return null
  if (pathnameAllowedForRole(pathname, role)) return null
  return defaultHomeForRole(role)
}
