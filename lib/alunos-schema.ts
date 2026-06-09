import { query } from "@/lib/db"
import { resolveDbConfig } from "@/lib/db-config"

/** Colunas reais da tabela `alunos` (PostgreSQL — nomes em minúsculas). */
export async function getAlunosColumns(): Promise<Set<string>> {
  const schema = resolveDbConfig().schema
  const rows = await query<{ column_name: string }>(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = ? AND table_name = 'alunos'`,
    [schema],
  )
  return new Set(rows.map((r) => r.column_name.toLowerCase()))
}
