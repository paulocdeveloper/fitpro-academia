/**
 * Detecta projeto Supabase ligado (CLI), gera .env, valida conexão e aplica schema.
 * Uso: npm run supabase:setup
 */
import { execSync } from "node:child_process"
import { readFileSync, writeFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"
import crypto from "node:crypto"
import keytar from "keytar"
import pg from "pg"

const ROOT = process.cwd()
const PROJECT_REF_FILE = resolve(ROOT, "supabase/.temp/project-ref")
const POOLER_URL_FILE = resolve(ROOT, "supabase/.temp/pooler-url")
const SCHEMA_FILE = resolve(ROOT, "data/supabase_fitpro_schema.sql")
const ENV_FILE = resolve(ROOT, ".env")

function readProjectRef() {
  if (existsSync(PROJECT_REF_FILE)) {
    return readFileSync(PROJECT_REF_FILE, "utf8").trim()
  }
  const list = execSync("npx supabase projects list -o json", { encoding: "utf8" })
  const projects = JSON.parse(list)
  const fitpro =
    projects.find((p) => /fitpro|academia|drip-marketplace/i.test(p.name)) ??
    projects.find((p) => p.region?.includes("South America")) ??
    projects[0]
  if (!fitpro?.id) throw new Error("Nenhum projeto Supabase encontrado. Execute: npx supabase login")
  execSync(`npx supabase link --project-ref ${fitpro.id} --yes`, { stdio: "inherit" })
  return fitpro.id
}

function fetchApiKeys(projectRef) {
  const raw = execSync(`npx supabase projects api-keys --project-ref ${projectRef} -o json`, {
    encoding: "utf8",
  })
  const keys = JSON.parse(raw)
  const anon = keys.find((k) => k.name === "anon")?.api_key
  const service = keys.find((k) => k.name === "service_role")?.api_key
  if (!anon) throw new Error("anon key não encontrada")
  return { anon, service }
}

async function getAccessToken() {
  const fromEnv = process.env.SUPABASE_ACCESS_TOKEN?.trim()
  if (fromEnv) return fromEnv
  const token = await keytar.findPassword("Supabase CLI")
  if (!token) throw new Error("Token Supabase não encontrado. Execute: npx supabase login")
  return token
}

async function ensureDatabasePassword(projectRef, token) {
  const newPassword = crypto.randomBytes(24).toString("base64url")
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/password`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password: newPassword }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Falha ao definir password DB (${res.status}): ${body}`)
  }
  return newPassword
}

function buildDatabaseUrl(projectRef, password) {
  let pooler = existsSync(POOLER_URL_FILE)
    ? readFileSync(POOLER_URL_FILE, "utf8").trim()
    : `postgresql://postgres.${projectRef}@aws-1-sa-east-1.pooler.supabase.com:5432/postgres`

  const u = new URL(pooler)
  u.password = password
  if (!u.username) u.username = `postgres.${projectRef}`
  if (!u.pathname || u.pathname === "/") u.pathname = "/postgres"
  return u.toString()
}

function writeEnv({ projectRef, databaseUrl, anon, service, jwtSecret }) {
  const content = `# Gerado automaticamente por npm run supabase:setup em ${new Date().toISOString()}
DB_DIALECT=postgres
SUPABASE_PROJECT_REF=${projectRef}

DATABASE_URL=${databaseUrl}

NEXT_PUBLIC_SUPABASE_URL=https://${projectRef}.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=${anon}

SUPABASE_SERVICE_ROLE_KEY=${service}

JWT_SECRET=${jwtSecret}
DB_SSL=true
`
  writeFileSync(ENV_FILE, content, "utf8")
  console.log(".env atualizado →", ENV_FILE)
}

async function testPgConnection(databaseUrl) {
  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  })
  await client.connect()
  const r = await client.query("SELECT current_database() AS db, 1 AS ok")
  await client.end()
  return r.rows[0]
}

async function applySchemaViaCli() {
  console.log("Aplicando schema via Supabase CLI (--linked)…")
  execSync(`npx supabase db query --linked -f "${SCHEMA_FILE}"`, { stdio: "inherit" })
}

async function verifyTables(databaseUrl) {
  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  })
  await client.connect()
  const required = [
    "academias",
    "usuarios",
    "alunos",
    "treinos",
    "planos_academia",
    "pagamentos",
    "agenda_eventos",
  ]
  const found = []
  for (const t of required) {
    const r = await client.query(
      `SELECT COUNT(*)::int AS c FROM information_schema.tables WHERE table_schema='public' AND table_name=$1`,
      [t],
    )
    if (Number(r.rows[0]?.c) > 0) found.push(t)
  }
  const master = await client.query(
    `SELECT id, email, perfil FROM usuarios WHERE lower(email)=$1 LIMIT 1`,
    ["master@academia.com"],
  )
  await client.end()
  return { tables: found, master: master.rows[0] ?? null }
}

async function main() {
  console.log("=== Supabase auto-setup ===\n")

  const projectRef = readProjectRef()
  console.log("Projeto:", projectRef)

  const { anon, service } = fetchApiKeys(projectRef)
  const token = await getAccessToken()
  const password = await ensureDatabasePassword(projectRef, token)
  const databaseUrl = buildDatabaseUrl(projectRef, password)
  const jwtSecret =
    process.env.JWT_SECRET?.trim() ||
    crypto.randomBytes(32).toString("hex")

  writeEnv({ projectRef, databaseUrl, anon, service, jwtSecret })

  console.log("\nTestando conexão PostgreSQL (pg)…")
  const ping = await testPgConnection(databaseUrl)
  console.log("Conexão pg OK — base:", ping.db)

  await applySchemaViaCli()

  const check = await verifyTables(databaseUrl)
  console.log("\nTabelas FitPro:", check.tables.join(", "))
  console.log("Master user:", check.master ? `${check.master.email} (${check.master.perfil})` : "AUSENTE")

  if (check.tables.length < 7 || !check.master) {
    throw new Error("Verificação incompleta — rode npm run db:bootstrap")
  }

  console.log("\n=== Setup concluído ===")
  console.log("Login: master@academia.com / Master@123")
  console.log("Próximo: npm run dev")
}

main().catch((e) => {
  console.error("\nErro:", e.message ?? e)
  process.exit(1)
})
