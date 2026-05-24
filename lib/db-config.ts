import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

export type DbDialect = "postgres"

const ENV_KEYS_FROM_FILE = new Set([
  "DB_DIALECT",
  "DATABASE_URL",
  "SUPABASE_DB_URL",
  "POSTGRES_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_PROJECT_REF",
  "JWT_SECRET",
  "DB_SSL",
  "DB_SCHEMA",
  "DB_SSL_REJECT_UNAUTHORIZED",
])

/** Variáveis MySQL legadas — ignoradas quando Supabase está configurado. */
const MYSQL_LEGACY_KEYS = ["DB_HOST", "DB_PORT", "DB_USER", "DB_PASSWORD", "DB_DATABASE", "MYSQL_URL", "MYSQL_PUBLIC_URL"] as const

let envLoaded = false

/**
 * Carrega .env e força valores do ficheiro (evita DB_HOST=127.0.0.1 do sistema sobrescrever Supabase).
 */
export function loadEnvFile(): void {
  if (envLoaded) return
  const p = resolve(process.cwd(), ".env")
  if (existsSync(p)) {
    const content = readFileSync(p, "utf8")
    const fromFile: Record<string, string> = {}
    for (const line of content.split(/\r?\n/)) {
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
      if (ENV_KEYS_FROM_FILE.has(key) || key.startsWith("NEXT_PUBLIC_SUPABASE")) {
        process.env[key] = val
      }
    }

    const supabaseActive =
      parsePostgresUrl(fromFile.DATABASE_URL ?? fromFile.SUPABASE_DB_URL) ||
      parsePostgresUrl(process.env.DATABASE_URL) ||
      Boolean(fromFile.NEXT_PUBLIC_SUPABASE_URL?.trim()) ||
      fromFile.DB_DIALECT === "postgres"

    if (supabaseActive) {
      process.env.DB_DIALECT = "postgres"
      for (const k of MYSQL_LEGACY_KEYS) {
        delete process.env[k]
      }
    }
  }
  envLoaded = true
}

export function loadEnvFileIfNeeded(): void {
  loadEnvFile()
}

function parsePostgresUrl(raw: string | undefined): {
  host: string
  port: number
  user: string
  password: string
  database: string
} | null {
  if (!raw?.trim()) return null
  try {
    const u = new URL(raw.trim())
    if (u.protocol !== "postgres:" && u.protocol !== "postgresql:") return null
    const database = u.pathname.replace(/^\//, "").split("?")[0]
    return {
      host: u.hostname,
      port: u.port ? Number(u.port) : 5432,
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      database: database || "postgres",
    }
  } catch {
    return null
  }
}

export type ResolvedDbConfig = {
  dialect: DbDialect
  host: string
  port: number
  user: string
  password: string
  database: string
  schema: string
  pgConnectionString: string
}

export function getDbDialect(): DbDialect {
  loadEnvFile()
  return "postgres"
}

export function isSupabaseConfigured(): boolean {
  loadEnvFile()
  const url = process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? ""
  return Boolean(parsePostgresUrl(url) || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim())
}

export function resolveDbConfig(): ResolvedDbConfig {
  loadEnvFile()

  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase não configurado. Defina DATABASE_URL (postgresql://...) e NEXT_PUBLIC_SUPABASE_URL no .env. Execute: npm run supabase:setup",
    )
  }

  const pgRaw = (process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? "").trim()
  const fromUrl = parsePostgresUrl(pgRaw)
  if (!fromUrl) {
    throw new Error(
      `DATABASE_URL inválida (esperado postgresql://...). Valor atual começa com: ${pgRaw.slice(0, 20) || "(vazio)"}`,
    )
  }

  const schema = (process.env.DB_SCHEMA ?? "public").trim() || "public"

  return {
    dialect: "postgres",
    host: fromUrl.host,
    port: fromUrl.port,
    user: fromUrl.user,
    password: fromUrl.password,
    database: fromUrl.database,
    schema,
    pgConnectionString: pgRaw,
  }
}

/** Informação segura para logs/API (sem password). */
export function getDbConnectionInfo(): {
  dialect: DbDialect
  host: string
  port: number
  database: string
  schema: string
  user: string
  supabaseProject: string | null
  connectionStringPresent: boolean
} {
  const cfg = resolveDbConfig()
  return {
    dialect: cfg.dialect,
    host: cfg.host,
    port: cfg.port,
    database: cfg.database,
    schema: cfg.schema,
    user: cfg.user,
    supabaseProject: process.env.SUPABASE_PROJECT_REF ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? null,
    connectionStringPresent: Boolean(cfg.pgConnectionString),
  }
}
