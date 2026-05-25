/** Papéis expostos no JWT (admin engloba master do banco). */
export type UserRole = "admin" | "personal" | "aluno" | "usuario"

export function perfilToRole(perfil: string | null | undefined): UserRole {
  const p = (perfil ?? "").toLowerCase()
  if (p === "master" || p === "admin") return "admin"
  if (p === "personal") return "personal"
  if (p === "usuario") return "usuario"
  if (p === "aluno") return "aluno"
  return "aluno"
}

export function isStaffRole(role: UserRole): boolean {
  return role === "admin" || role === "personal"
}

export function isAlunoRole(role: UserRole): boolean {
  return role === "aluno"
}

export function isUsuarioRole(role: UserRole): boolean {
  return role === "usuario"
}

/** Aluno matriculado ou usuário fitness (app B2C). */
export function isFitnessRole(role: UserRole): boolean {
  return role === "aluno" || role === "usuario"
}

export function canViewAllTreinos(role: UserRole): boolean {
  return isStaffRole(role)
}
