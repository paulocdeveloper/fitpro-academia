/**
 * Carregamento de .env no runtime Next.js (server).
 * Espelha scripts/env-loader.mjs — mantenha a lógica sincronizada.
 */
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

const MYSQL_LEGACY = [
  "DB_HOST",
  "DB_PORT",
  "DB_USER",
  "DB_PASSWORD",
  "DB_DATABASE",
  "DB_NAME",
  "MYSQL_URL",
  "MYSQL_HOST",
  "MYSQL_DATABASE",
  "MYSQL_PUBLIC_URL",
] as const

let loaded = false

function isRenderRuntime(): boolean {
  return Boolean(
    process.env.RENDER ||
      process.env.RENDER_SERVICE_ID ||
      process.env.RENDER_SERVICE_NAME ||
      process.env.RENDER_EXTERNAL_URL,
  )
}

function isProduction(): boolean {
  return process.env.NODE_ENV === "production" || isRenderRuntime()
}

function parseEnvFile(filePath: string): Record<string, string> {
  const out: Record<string, string> = {}
  if (!existsSync(filePath)) return out
  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
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
    out[key] = val
  }
  return out
}

function parsePostgresUrl(raw: string | undefined): string | null {
  if (!raw?.trim()) return null
  try {
    const u = new URL(raw.trim())
    if (u.protocol !== "postgres:" && u.protocol !== "postgresql:") return null
    return u.hostname
  } catch {
    return null
  }
}

function envFileCandidates(): string[] {
  const root = process.cwd()
  const list = [".env", ".env.local"]
  if (!isProduction()) {
    list.push(".env.development", ".env.development.local")
  }
  return list.map((name) => resolve(root, name))
}

/** Carrega .env → process.env (idempotente). Next.js também carrega, isto garante scripts/db-config. */
export function loadProjectEnv(force = false): void {
  if (loaded && !force) return

  const onRender = isRenderRuntime()
  const merged: Record<string, string> = {}

  for (const filePath of envFileCandidates()) {
    Object.assign(merged, parseEnvFile(filePath))
  }

  const preferFile = !onRender

  for (const [key, val] of Object.entries(merged)) {
    if (onRender && process.env[key] !== undefined && process.env[key] !== "") continue
    if (preferFile || process.env[key] === undefined || process.env[key] === "") {
      process.env[key] = val
    }
  }

  const supabaseActive =
    parsePostgresUrl(merged.DATABASE_URL ?? merged.SUPABASE_DB_URL) ||
    parsePostgresUrl(process.env.DATABASE_URL) ||
    Boolean((merged.NEXT_PUBLIC_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL)?.trim()) ||
    merged.DB_DIALECT === "postgres" ||
    process.env.DB_DIALECT === "postgres"

  if (supabaseActive) {
    process.env.DB_DIALECT = "postgres"
    for (const k of MYSQL_LEGACY) {
      delete process.env[k]
    }
  }

  loaded = true
}

export type EnvValidation = {
  ok: boolean
  runtime: "development" | "production" | "render"
  required: {
    DATABASE_URL: boolean
    NEXT_PUBLIC_SUPABASE_URL: boolean
    NEXT_PUBLIC_SUPABASE_ANON_KEY: boolean
  }
  optional: {
    OPENAI_API_KEY: boolean
    JWT_SECRET: boolean
  }
  errors: string[]
  warnings: string[]
}

export function validateEnvironment(): EnvValidation {
  loadProjectEnv()

  const required = {
    DATABASE_URL: Boolean(process.env.DATABASE_URL?.trim()),
    NEXT_PUBLIC_SUPABASE_URL: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()),
  }

  const optional = {
    OPENAI_API_KEY: Boolean(process.env.OPENAI_API_KEY?.trim()),
    JWT_SECRET: Boolean(process.env.JWT_SECRET?.trim() && process.env.JWT_SECRET.length >= 32),
  }

  const errors: string[] = []
  const warnings: string[] = []

  if (!required.DATABASE_URL) {
    errors.push("DATABASE_URL ausente.")
  } else if (!parsePostgresUrl(process.env.DATABASE_URL)) {
    errors.push("DATABASE_URL deve ser postgresql://...")
  }

  if (!required.NEXT_PUBLIC_SUPABASE_URL) errors.push("NEXT_PUBLIC_SUPABASE_URL ausente.")
  if (!required.NEXT_PUBLIC_SUPABASE_ANON_KEY) errors.push("NEXT_PUBLIC_SUPABASE_ANON_KEY ausente.")

  if (!optional.OPENAI_API_KEY) {
    warnings.push("OPENAI_API_KEY ausente — IA Vision limitada.")
  }

  if (isProduction() && !optional.JWT_SECRET) {
    errors.push("JWT_SECRET obrigatório em produção (32+ caracteres).")
  }

  const runtime = isRenderRuntime() ? "render" : isProduction() ? "production" : "development"

  return { ok: errors.length === 0, runtime, required, optional, errors, warnings }
}

export function logEnvValidationOnStartup(): void {
  const v = validateEnvironment()
  if (v.warnings.length) {
    for (const w of v.warnings) console.warn(`[env] ${w}`)
  }
  if (!v.ok) {
    for (const e of v.errors) console.error(`[env] ${e}`)
    if (process.env.NODE_ENV === "production") {
      throw new Error("Variáveis de ambiente obrigatórias ausentes. Verifique Render Environment ou .env")
    }
    console.error("[env] Corrija o .env e execute: npm run env:check")
  }
}
