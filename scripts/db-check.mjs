/**
 * Verifica conexão Supabase. Uso: npm run db:check
 */
import pg from "pg"
import { loadEnvFile, resolvePostgresConfig } from "./db-env.mjs"

loadEnvFile()
const cfg = resolvePostgresConfig()
const ssl = cfg.host.includes("supabase") ? { rejectUnauthorized: false } : undefined
const client = new pg.Client({ connectionString: cfg.connectionString, ssl })

const TABLES = [
  "academias",
  "usuarios",
  "alunos",
  "treinos",
  "planos_academia",
  "pagamentos",
  "agenda_eventos",
]

try {
  await client.connect()
  const ping = await client.query("SELECT current_database() AS db, current_user AS u, 1 AS ok")
  console.log("Supabase PostgreSQL OK")
  console.log("  Host:", cfg.host)
  console.log("  Base:", ping.rows[0]?.db)
  console.log("  User:", ping.rows[0]?.u)

  for (const t of TABLES) {
    const r = await client.query(
      `SELECT COUNT(*)::int AS c FROM information_schema.tables WHERE table_schema='public' AND table_name=$1`,
      [t],
    )
    console.log(Number(r.rows[0]?.c) > 0 ? "  ✓" : "  ✗", t)
  }

  const u = await client.query(
    `SELECT id, email, perfil::text AS perfil FROM usuarios WHERE lower(email)=$1`,
    ["master@academia.com"],
  )
  console.log("Master:", u.rows[0] ? `${u.rows[0].email} (${u.rows[0].perfil}) id=${u.rows[0].id}` : "NÃO ENCONTRADO")
  console.log("\nConexão: OK — apenas Supabase PostgreSQL")
} catch (e) {
  console.error("\nConexão: FALHOU")
  console.error(e.message ?? e)
  process.exit(1)
} finally {
  await client.end().catch(() => {})
}
