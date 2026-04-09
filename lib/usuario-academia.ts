import { query } from "@/lib/db"

export async function usuarioPertenceAcademia(userId: number, academiaId: number): Promise<boolean> {
  const rows = await query<{ n: number }>(
    "SELECT 1 AS n FROM usuarios WHERE id = ? AND academia_id = ? LIMIT 1",
    [userId, academiaId],
  )
  return rows.length > 0
}
