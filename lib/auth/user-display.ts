import type { UserRole } from "@/lib/auth/roles"

/** Rótulo profissional do papel — nunca expor e-mail na UI pública */
export function roleLabel(role: UserRole | string): string {
  switch (role) {
    case "admin":
      return "Administrador"
    case "personal":
      return "Personal trainer"
    case "aluno":
      return "Aluno"
    case "usuario":
      return "Fitness"
    default:
      return "Usuário"
  }
}

export function initialsFromDisplayName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function displayNameFrom(nome: string | null | undefined, role: UserRole): string {
  const n = nome?.trim()
  if (n && n.length > 1) return n
  return roleLabel(role)
}

/** Mascara e-mail em telas sensíveis (ex.: configurações em público) */
export function maskEmail(email: string): string {
  const at = email.indexOf("@")
  if (at < 1) return "••••••"
  const local = email.slice(0, at)
  const domain = email.slice(at + 1)
  const shown = local.length <= 2 ? `${local[0] ?? ""}*` : `${local.slice(0, 2)}***`
  return `${shown}@${domain}`
}
