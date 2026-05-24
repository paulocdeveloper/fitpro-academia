/**
 * Bootstrap PostgreSQL / Supabase: aplica schema + seeds.
 * Uso: npm run db:bootstrap  (com DATABASE_URL postgresql:// no .env)
 */
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import pg from "pg"
import { loadEnvFile, getDbDialect, resolvePostgresConfig } from "./db-env.mjs"

loadEnvFile()

if (getDbDialect() !== "postgres") {
  console.error("db:bootstrap (Supabase) requer DATABASE_URL postgresql:// no .env")
  console.error("Defina DATABASE_URL, SUPABASE_DB_URL ou DB_DIALECT=postgres")
  process.exit(1)
}

const cfg = resolvePostgresConfig()
if (!cfg.connectionString || cfg.connectionString.includes("[PROJECT-REF]") || cfg.connectionString.includes("[SUA-SENHA]")) {
  console.error("DATABASE_URL inválida ou ainda com placeholders no .env")
  console.error("Supabase → Settings → Database → Connection string → URI")
  console.error("Exemplo: postgresql://postgres.xxxxx:senha@aws-0-sa-east-1.pooler.supabase.com:6543/postgres")
  process.exit(1)
}
const schemaPath = resolve(process.cwd(), "data/supabase_fitpro_schema.sql")
const sql = readFileSync(schemaPath, "utf8")

const ssl =
  cfg.host.includes("supabase") || process.env.DB_SSL === "true"
    ? { rejectUnauthorized: false }
    : undefined

console.log("A ligar ao Supabase/PostgreSQL…")
console.log("  Host:", cfg.host)
console.log("  Base:", cfg.database, "(use sempre 'postgres' no Supabase)")

const client = new pg.Client({
  connectionString: cfg.connectionString,
  ssl,
})

const REQUIRED_TABLES = [
  "academias",
  "usuarios",
  "alunos",
  "treinos",
  "planos_academia",
  "pagamentos",
  "agenda_eventos",
  "dietas",
  "alimentos",
]

try {
  await client.connect()
  await client.query("SELECT 1")
  console.log("Conexão OK")

  console.log("A aplicar schema (data/supabase_fitpro_schema.sql)…")
  await client.query(sql)
  console.log("Schema aplicado")

  for (const table of REQUIRED_TABLES) {
    const r = await client.query(
      `SELECT COUNT(*)::int AS c FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = $1`,
      [table],
    )
    const ok = Number(r.rows[0]?.c) > 0
    console.log(ok ? "  ✓" : "  ✗", table)
    if (!ok) {
      throw new Error(`Tabela em falta: ${table}`)
    }
  }

  const master = await client.query(
    `SELECT id, email, perfil FROM usuarios WHERE lower(email) = $1 LIMIT 1`,
    ["master@academia.com"],
  )
  if (!master.rows[0]) {
    throw new Error("Utilizador master não encontrado após seed")
  }
  console.log("Utilizador master:", master.rows[0].email, `(${master.rows[0].perfil})`)

  console.log("")
  console.log("Bootstrap Supabase concluído.")
  console.log("Login: master@academia.com / Master@123")
  console.log("Teste: npm run db:check  e  npm run dev")
} catch (e) {
  console.error("Erro no bootstrap Supabase:", e.message ?? e)
  if (e.code === "ENOTFOUND") {
    console.error("Host inválido. Verifique DATABASE_URL no .env")
  }
  if (e.code === "28P01") {
    console.error("Password incorreta. Settings → Database → reset password")
  }
  if (e.code === "3D000") {
    console.error("Base inexistente. No Supabase use /postgres no final da URL")
  }
  process.exit(1)
} finally {
  await client.end().catch(() => {})
}
