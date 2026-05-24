/**
 * Configura Render (fitpro-academia) para Supabase e dispara deploy com cache limpo.
 *
 * Requer: RENDER_API_KEY no ambiente (Render Dashboard → Account → API Keys)
 *
 * Uso:
 *   $env:RENDER_API_KEY="rnd_..."
 *   node scripts/render-deploy-supabase.mjs
 */
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

const API = "https://api.render.com/v1"
const SERVICE_NAME = "fitpro-academia"
const MYSQL_KEYS = ["DB_HOST", "DB_PORT", "DB_USER", "DB_PASSWORD", "DB_DATABASE", "MYSQL_URL", "MYSQL_HOST", "MYSQL_DATABASE", "MYSQL_PUBLIC_URL", "DB_DIALECT"]

function loadDotEnv() {
  const p = resolve(process.cwd(), ".env")
  if (!existsSync(p)) throw new Error(".env não encontrado — rode npm run supabase:setup")
  const out = {}
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith("#")) continue
    const eq = t.indexOf("=")
    if (eq < 1) continue
    out[t.slice(0, eq).trim()] = t.slice(eq + 1).trim()
  }
  return out
}

async function api(path, options = {}) {
  const key = process.env.RENDER_API_KEY?.trim()
  if (!key) {
    throw new Error(
      "RENDER_API_KEY ausente. Crie em https://dashboard.render.com/u/settings#api-keys e execute:\n  $env:RENDER_API_KEY=\"rnd_...\"\n  node scripts/render-deploy-supabase.mjs",
    )
  }
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      ...options.headers,
    },
  })
  const text = await res.text()
  let body
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = text
  }
  if (!res.ok) {
    throw new Error(`Render API ${res.status} ${path}: ${typeof body === "string" ? body : JSON.stringify(body)}`)
  }
  return body
}

async function findService() {
  let cursor = null
  do {
    const q = cursor ? `?limit=100&cursor=${cursor}` : "?limit=100"
    const data = await api(`/services${q}`)
    for (const item of data) {
      const s = item.service ?? item
      if (s.name === SERVICE_NAME || s.slug === SERVICE_NAME) return s
    }
    cursor = data.length ? data[data.length - 1]?.cursor : null
  } while (cursor)
  throw new Error(`Serviço "${SERVICE_NAME}" não encontrado na conta Render`)
}

async function listEnvVars(serviceId) {
  const data = await api(`/services/${serviceId}/env-vars?limit=100`)
  return data.map((row) => row.envVar ?? row)
}

async function setEnvVar(serviceId, key, value) {
  await api(`/services/${serviceId}/env-vars/${encodeURIComponent(key)}`, {
    method: "PUT",
    body: JSON.stringify({ envVarValue: value }),
  })
}

async function deleteEnvVar(serviceId, key) {
  try {
    await api(`/services/${serviceId}/env-vars/${encodeURIComponent(key)}`, {
      method: "DELETE",
    })
    return true
  } catch (e) {
    if (String(e.message).includes("404")) return false
    throw e
  }
}

async function triggerDeploy(serviceId) {
  return api(`/services/${serviceId}/deploys`, {
    method: "POST",
    body: JSON.stringify({ clearCache: "clear" }),
  })
}

const env = loadDotEnv()
const required = {
  DATABASE_URL: env.DATABASE_URL,
  NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
}
for (const [k, v] of Object.entries(required)) {
  if (!v?.trim()) throw new Error(`${k} ausente no .env local`)
}

console.log("=== Render: configurar Supabase + deploy ===\n")

const service = await findService()
console.log("Serviço:", service.name, `(${service.id})`)

const before = await listEnvVars(service.id)
console.log("\nVariáveis ANTES:")
const wrong = []
for (const v of before) {
  const mark = MYSQL_KEYS.includes(v.key) ? " ← REMOVER" : ""
  if (MYSQL_KEYS.includes(v.key)) wrong.push(v.key)
  console.log(`  ${v.key}${mark}`)
}

console.log("\nA remover variáveis MySQL legadas…")
for (const k of MYSQL_KEYS) {
  if (before.some((v) => v.key === k)) {
    await deleteEnvVar(service.id, k)
    console.log("  removido:", k)
  }
}

console.log("\nA definir variáveis Supabase…")
for (const [k, v] of Object.entries(required)) {
  await setEnvVar(service.id, k, v)
  console.log("  OK:", k)
}

if (!before.some((v) => v.key === "JWT_SECRET")) {
  console.log("  (JWT_SECRET: mantenha o existente no Render ou gere no painel)")
}

console.log("\nA disparar deploy (clear build cache)…")
const deploy = await triggerDeploy(service.id)
const deployId = deploy.id ?? deploy.deploy?.id ?? "(ver painel)"
console.log("Deploy iniciado:", deployId)
console.log("\nAguarde 3–5 min e teste:")
console.log("  https://fitpro-academia.onrender.com/api/health")
console.log("  https://fitpro-academia.onrender.com/login")
console.log("\n=== Concluído ===")
