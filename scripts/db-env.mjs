/**
 * Configuração de base — apenas Supabase PostgreSQL.
 */
import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"

let envLoaded = false

const ENV_KEYS = new Set([
  "DB_DIALECT",
  "DATABASE_URL",
  "SUPABASE_DB_URL",
  "JWT_SECRET",
  "DB_SSL",
  "DB_SCHEMA",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_PROJECT_REF",
])

const MYSQL_LEGACY = ["DB_HOST", "DB_PORT", "DB_USER", "DB_PASSWORD", "DB_DATABASE", "MYSQL_URL"]

export function loadEnvFile() {
  if (envLoaded) return
  const p = resolve(process.cwd(), ".env")
  if (existsSync(p)) {
    const fromFile = {}
    for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
      const t = line.trim()
      if (!t || t.startsWith("#")) continue
      const eq = t.indexOf("=")
      if (eq < 1) continue
      const key = t.slice(0, eq).trim()
      let val = t.slice(eq + 1).trim()
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1)
      }
      fromFile[key] = val
    }
    for (const [key, val] of Object.entries(fromFile)) {
      if (ENV_KEYS.has(key) || key.startsWith("NEXT_PUBLIC_SUPABASE")) {
        process.env[key] = val
      }
    }
    if (parsePostgresUrl(fromFile.DATABASE_URL ?? fromFile.SUPABASE_DB_URL)) {
      process.env.DB_DIALECT = "postgres"
      for (const k of MYSQL_LEGACY) delete process.env[k]
    }
  }
  envLoaded = true
}

export function loadEnvFileIfNeeded() {
  loadEnvFile()
}

function parsePostgresUrl(raw) {
  if (!raw?.trim()) return null
  try {
    const u = new URL(raw.trim())
    if (u.protocol !== "postgres:" && u.protocol !== "postgresql:") return null
    return {
      host: u.hostname,
      port: u.port ? Number(u.port) : 5432,
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      database: u.pathname.replace(/^\//, "").split("?")[0] || "postgres",
    }
  } catch {
    return null
  }
}

export function getDbDialect() {
  loadEnvFile()
  return "postgres"
}

export function resolvePostgresConfig() {
  loadEnvFile()
  const raw = (process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? "").trim()
  const fromUrl = parsePostgresUrl(raw)
  if (!fromUrl) {
    throw new Error("DATABASE_URL postgresql:// ausente no .env — execute npm run supabase:setup")
  }
  return { ...fromUrl, connectionString: raw }
}

export function resolveDbConfig() {
  return resolvePostgresConfig()
}

export function requireDbConfig() {
  return resolvePostgresConfig()
}
