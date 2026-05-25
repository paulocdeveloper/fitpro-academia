/**
 * Carregamento centralizado de variáveis — usado por scripts e espelhado em lib/env/load-env.ts
 *
 * Ordem: .env → .env.local → .env.development → .env.development.local
 * Produção Render: variáveis do painel têm prioridade (não sobrescreve process.env existente).
 * Desenvolvimento local: ficheiro .env tem prioridade sobre variáveis do sistema (evita MySQL legado).
 */
import { existsSync, readFileSync } from "node:fs"
import { homedir } from "node:os"
import { resolve } from "node:path"

const ROOT = process.cwd()

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
]

let loaded = false

/** Sessão Render CLI (~/.render/cli.yaml) — fallback automático para RENDER_API_KEY */
export function resolveRenderApiKey() {
  const fromEnv = process.env.RENDER_API_KEY?.trim()
  if (fromEnv) return fromEnv
  const cliPath = resolve(homedir(), ".render", "cli.yaml")
  if (!existsSync(cliPath)) return ""
  const m = readFileSync(cliPath, "utf8").match(/^\s*key:\s*(rnd_[A-Za-z0-9]+)/m)
  return m?.[1] ?? ""
}

function applyRenderCliSession() {
  const key = resolveRenderApiKey()
  if (key && !process.env.RENDER_API_KEY?.trim()) {
    process.env.RENDER_API_KEY = key
  }
}

function isRenderRuntime() {
  return Boolean(
    process.env.RENDER ||
      process.env.RENDER_SERVICE_ID ||
      process.env.RENDER_SERVICE_NAME ||
      process.env.RENDER_EXTERNAL_URL,
  )
}

function isProduction() {
  return process.env.NODE_ENV === "production" || isRenderRuntime()
}

function parseEnvFile(filePath) {
  const out = {}
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

function parsePostgresUrl(raw) {
  if (!raw?.trim()) return null
  try {
    const u = new URL(raw.trim())
    if (u.protocol !== "postgres:" && u.protocol !== "postgresql:") return null
    return u.hostname
  } catch {
    return null
  }
}

function envFileCandidates() {
  const list = [".env", ".env.local"]
  if (!isProduction()) {
    list.push(".env.development", ".env.development.local")
  }
  return list.map((name) => resolve(ROOT, name))
}

/**
 * Carrega .env para process.env (idempotente).
 * @returns {{ files: string[], keys: string[] }}
 */
export function loadProjectEnv(options = {}) {
  const force = options.force === true
  if (loaded && !force) {
    return { files: [], keys: Object.keys(process.env).filter((k) => !k.startsWith("npm_")) }
  }

  const onRender = isRenderRuntime()
  const merged = {}
  const loadedFiles = []

  for (const filePath of envFileCandidates()) {
    const parsed = parseEnvFile(filePath)
    if (Object.keys(parsed).length === 0) continue
    loadedFiles.push(filePath)
    Object.assign(merged, parsed)
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
  applyRenderCliSession()
  return { files: loadedFiles, keys: Object.keys(merged) }
}

/** Compatível com db-env.mjs / scripts antigos */
export function loadEnvFile() {
  return loadProjectEnv()
}

export function loadEnvFileIfNeeded() {
  return loadProjectEnv()
}

export function getEnvDiagnostics() {
  loadProjectEnv()
  const required = {
    DATABASE_URL: Boolean(process.env.DATABASE_URL?.trim()),
    NEXT_PUBLIC_SUPABASE_URL: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()),
  }
  const optional = {
    OPENAI_API_KEY: Boolean(process.env.OPENAI_API_KEY?.trim()),
    OPENAI_VISION_MODEL: Boolean(process.env.OPENAI_VISION_MODEL?.trim()) || "gpt-4o (default)",
    JWT_SECRET: Boolean(process.env.JWT_SECRET?.trim() && process.env.JWT_SECRET.length >= 32),
    RENDER_API_KEY: Boolean(process.env.RENDER_API_KEY?.trim()),
  }

  const errors = []
  const warnings = []

  if (!required.DATABASE_URL) {
    errors.push("DATABASE_URL ausente — copie do Supabase Dashboard (Connection string pooler).")
  } else if (!parsePostgresUrl(process.env.DATABASE_URL)) {
    errors.push("DATABASE_URL inválida — use postgresql://... (Supabase pooler porta 5432).")
  }

  if (!required.NEXT_PUBLIC_SUPABASE_URL) {
    errors.push("NEXT_PUBLIC_SUPABASE_URL ausente — Settings → API no Supabase.")
  }

  if (!required.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    errors.push("NEXT_PUBLIC_SUPABASE_ANON_KEY ausente — Settings → API → anon public.")
  }

  if (!optional.OPENAI_API_KEY) {
    warnings.push(
      "OPENAI_API_KEY ausente — IA nutricional Vision usará fallback visual limitado. Adicione ao .env ou Render Environment.",
    )
  }

  if (!optional.JWT_SECRET && isProduction()) {
    errors.push("JWT_SECRET ausente ou curto em produção (mínimo 32 caracteres).")
  } else if (!optional.JWT_SECRET) {
    warnings.push("JWT_SECRET ausente — dev usa segredo temporário (não use em produção).")
  }

  for (const k of MYSQL_LEGACY) {
    if (process.env[k]) {
      warnings.push(`Variável MySQL legada detectada (${k}) — remova do ambiente.`)
    }
  }

  return {
    ok: errors.length === 0,
    runtime: onRenderLabel(),
    envFiles: envFileCandidates().map((p) => ({
      path: p,
      exists: existsSync(p),
    })),
    required,
    optional,
    errors,
    warnings,
  }
}

function onRenderLabel() {
  if (isRenderRuntime()) return "render"
  if (process.env.NODE_ENV === "production") return "production"
  return "development"
}

export function printEnvDiagnostics() {
  const d = getEnvDiagnostics()
  console.log("=== Diagnóstico de ambiente FitPro ===\n")
  console.log("Runtime:", d.runtime)
  console.log("\nFicheiros .env:")
  for (const f of d.envFiles) {
    console.log(`  ${f.exists ? "✓" : "—"} ${f.path}`)
  }

  console.log("\nObrigatórias:")
  for (const [k, ok] of Object.entries(d.required)) {
    console.log(`  ${ok ? "✓" : "✗"} ${k}`)
  }

  console.log("\nOpcionais:")
  console.log(`  ${d.optional.OPENAI_API_KEY ? "✓" : "~"} OPENAI_API_KEY ${d.optional.OPENAI_API_KEY ? "" : "(IA Vision offline)"}`)
  console.log(`  ${d.optional.JWT_SECRET ? "✓" : "~"} JWT_SECRET`)
  console.log(`  ${d.optional.RENDER_API_KEY ? "✓" : "~"} RENDER_API_KEY (deploy automático)`)
  console.log(`  OPENAI_VISION_MODEL: ${process.env.OPENAI_VISION_MODEL?.trim() || "gpt-4o (default)"}`)

  if (d.warnings.length) {
    console.log("\nAvisos:")
    for (const w of d.warnings) console.log("  ⚠", w)
  }

  if (d.errors.length) {
    console.log("\nErros:")
    for (const e of d.errors) console.log("  ✗", e)
    console.log("\nCorrija o .env (copie de .env.example) e execute: npm run env:check")
    return false
  }

  console.log("\n✓ Ambiente válido")
  return true
}

export function resolvePostgresConfig() {
  loadProjectEnv()
  const raw = (process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? "").trim()
  if (!parsePostgresUrl(raw)) {
    throw new Error("DATABASE_URL postgresql:// ausente no .env — execute npm run supabase:setup")
  }
  try {
    const u = new URL(raw)
    return {
      host: u.hostname,
      port: u.port ? Number(u.port) : 5432,
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      database: u.pathname.replace(/^\//, "").split("?")[0] || "postgres",
      connectionString: raw,
    }
  } catch {
    throw new Error("DATABASE_URL inválida")
  }
}

export function resolveDbConfig() {
  return resolvePostgresConfig()
}

export function requireDbConfig() {
  return resolvePostgresConfig()
}

export function getDbDialect() {
  loadProjectEnv()
  return "postgres"
}
