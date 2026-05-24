import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { verifyAccessToken } from "@/lib/auth/jwt"
import { maskEmail, roleLabel } from "@/lib/auth/user-display"
import { query } from "@/lib/db"
import { AUTH_COOKIE } from "@/lib/auth/session"
import { ConfiguracoesClient } from "./configuracoes-client"

export default async function ConfiguracoesPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get(AUTH_COOKIE)?.value
  if (!token) {
    redirect("/login?next=/configuracoes")
  }

  let session
  try {
    session = await verifyAccessToken(token)
  } catch {
    redirect("/login?next=/configuracoes")
  }

  const rows = await query<{ nome: string | null }>(
    `SELECT nome FROM usuarios WHERE id = ? LIMIT 1`,
    [session.userId],
  )
  const displayName = rows[0]?.nome?.trim() || roleLabel(session.role)

  return (
    <ConfiguracoesClient
      initialUser={{
        id: session.userId,
        displayName,
        emailMasked: maskEmail(session.email),
        roleLabel: roleLabel(session.role),
        academiaId: session.academiaId,
      }}
    />
  )
}
