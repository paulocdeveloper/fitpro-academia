import { execute, insertRow, query } from "@/lib/db"

/** Garante que existe pelo menos uma academia e devolve o id (o mais antigo). */
export async function ensureDefaultAcademiaId(): Promise<number> {
  const rows = await query<{ id: number }>("SELECT id FROM academias ORDER BY id ASC LIMIT 1")
  const first = rows[0]?.id
  if (first != null && Number(first) >= 1) {
    return Number(first)
  }
  const id = await insertRow("INSERT INTO academias (nome) VALUES (?)", ["Academia padrão"])
  return id
}

/** Associa utilizador sem tenant à academia padrão. Devolve o academiaId a usar no JWT. */
export async function ensureUserAcademiaId(userId: number): Promise<number> {
  const aid = await ensureDefaultAcademiaId()
  await execute(
    "UPDATE usuarios SET academia_id = ? WHERE id = ? AND (academia_id IS NULL OR academia_id < 1)",
    [aid, userId],
  )
  return aid
}
