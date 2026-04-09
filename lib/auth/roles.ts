/** Papéis expostos no JWT (admin engloba master do banco). */
export type UserRole = "admin" | "personal" | "aluno"

export function perfilToRole(perfil: string | null | undefined): UserRole {
  const p = (perfil ?? "").toLowerCase()
  if (p === "master" || p === "admin") return "admin"
  if (p === "personal") return "personal"
  return "aluno"
}

export function isStaffRole(role: UserRole): boolean {
  return role === "admin" || role === "personal"
}

export function canViewAllTreinos(role: UserRole): boolean {
  return isStaffRole(role)
}
