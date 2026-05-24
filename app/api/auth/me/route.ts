import { NextResponse } from "next/server"
import { query } from "@/lib/db"
import {
  displayNameFrom,
  initialsFromDisplayName,
  roleLabel,
} from "@/lib/auth/user-display"
import { getSessionFromRequest } from "@/lib/auth/session"

export async function GET(req: Request) {
  const session = await getSessionFromRequest(req)
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 })
  }

  const rows = await query<{ nome: string | null }>(
    `SELECT nome FROM usuarios WHERE id = ? LIMIT 1`,
    [session.userId],
  )
  const nome = rows[0]?.nome ?? null
  const displayName = displayNameFrom(nome, session.role)
  const label = roleLabel(session.role)

  return NextResponse.json({
    user: {
      id: session.userId,
      role: session.role,
      academiaId: session.academiaId,
      displayName,
      roleLabel: label,
      initials: initialsFromDisplayName(displayName),
    },
  })
}
