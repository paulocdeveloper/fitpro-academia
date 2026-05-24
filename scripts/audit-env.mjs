/**
 * Auditoria: qual .env e qual banco a app usa.
 */
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import pg from "pg"
import { loadEnvFile, resolvePostgresConfig } from "./db-env.mjs"

const ROOT = process.cwd()
const ENV_CANDIDATES = [
  ".env",
  ".env.local",
  ".env.development",
  ".env.development.local",
  ".env.production",
  ".env.production.local",
]

const MYSQL_KEYS = ["DB_HOST", "DB_DATABASE", "MYSQL_URL", "MYSQL_HOST", "MYSQL_DATABASE"]

function maskUrl(url) {
  if (!url) return "(ausente)"
  try {
    const u = new URL(url)
    if (u.password) u.password = "***"
    return u.toString()
  } catch {
    return "(inválida)"
  }
}

console.log("=== Auditoria FitPro ===\n")

console.log("Ficheiros .env:")
let loadedFile = null
for (const name of ENV_CANDIDATES) {
  const p = resolve(ROOT, name)
  if (!existsSync(p)) {
    console.log("  —", name)
    continue
  }
  console.log("  ✓", name)
  if (name === ".env" || name === ".env.local") loadedFile = p
  const keys = readFileSync(p, "utf8")
    .split(/\r?\n/)
    .filter((l) => l.trim() && !l.trim().startsWith("#"))
    .map((l) => l.split("=")[0].trim())
  console.log("     keys:", keys.join(", "))
}

console.log("\nMySQL no process.env:")
let bad = false
for (const k of MYSQL_KEYS) {
  if (process.env[k]) {
    bad = true
    console.log("  ✗", k, "=", process.env[k])
  }
}
if (!bad) console.log("  ✓ limpo")

loadEnvFile()
const cfg = resolvePostgresConfig()
console.log("\nBanco ativo: Supabase PostgreSQL")
console.log("  .env usado:", loadedFile ?? resolve(ROOT, ".env"))
console.log("  DATABASE_URL:", maskUrl(process.env.DATABASE_URL))
console.log("  host:", cfg.host)
console.log("  database:", cfg.database)

const client = new pg.Client({
  connectionString: cfg.connectionString,
  ssl: cfg.host.includes("supabase") ? { rejectUnauthorized: false } : undefined,
})
await client.connect()
const r = await client.query("SELECT current_database() AS db, current_user AS u")
await client.end()
console.log("  conexão real OK:", r.rows[0].db, "user", r.rows[0].u)
