import { loadProjectEnv } from "@/lib/env/load-env"

export type DbDialect = "postgres"

/** Carrega .env (delegado ao loader central — inclui OPENAI_*, Supabase, etc.). */
export function loadEnvFile(): void {
  loadProjectEnv()
}

export function loadEnvFileIfNeeded(): void {
  loadProjectEnv()
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
