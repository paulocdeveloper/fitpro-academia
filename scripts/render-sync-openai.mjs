/**
 * Sincroniza OPENAI_API_KEY e OPENAI_VISION_MODEL do .env local para o Render.
 *
 * Requer:
 *   RENDER_API_KEY — https://dashboard.render.com/u/settings#api-keys
 *   OPENAI_API_KEY no .env local
 *
 * Uso:
 *   $env:RENDER_API_KEY="rnd_..."
 *   npm run render:openai
 */
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

const API = "https://api.render.com/v1"
const SERVICE_NAME = "fitpro-academia"

function loadDotEnv() {
  const p = resolve(process.cwd(), ".env")
  if (!existsSync(p)) throw new Error(".env não encontrado")
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
  const key = (process.env.RENDER_API_KEY || loadDotEnv().RENDER_API_KEY || "").trim()
  if (!key) {
    throw new Error("RENDER_API_KEY ausente. Defina no ambiente antes de executar.")
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
  throw new Error(`Serviço "${SERVICE_NAME}" não encontrado`)
}

async function setEnvVar(serviceId, key, value) {
  if (!value?.trim()) throw new Error(`${key} vazio`)
  await api(`/services/${serviceId}/env-vars/${encodeURIComponent(key)}`, {
    method: "PUT",
    body: JSON.stringify({ value }),
  })
}

async function triggerDeploy(serviceId) {
  return api(`/services/${serviceId}/deploys`, {
    method: "POST",
    body: JSON.stringify({ clearCache: "clear" }),
  })
}

const env = loadDotEnv()
const openaiKey = (process.env.OPENAI_API_KEY || env.OPENAI_API_KEY || "").trim()
if (!openaiKey) {
  throw new Error("OPENAI_API_KEY ausente no .env local ou ambiente.")
}
const renderKey = (process.env.RENDER_API_KEY || env.RENDER_API_KEY || "").trim()
if (!renderKey) {
  throw new Error("RENDER_API_KEY ausente no .env local ou ambiente.")
}
process.env.RENDER_API_KEY = renderKey

const model = (process.env.OPENAI_VISION_MODEL || env.OPENAI_VISION_MODEL || "gpt-4o").trim()

console.log("=== Render: sincronizar OpenAI Vision ===\n")

const service = await findService()
console.log("Serviço:", service.name, `(${service.id})`)

console.log("\nConfigurando variáveis (valor da key NÃO será exibido)…")
await setEnvVar(service.id, "OPENAI_API_KEY", openaiKey)
console.log("  OK: OPENAI_API_KEY")
await setEnvVar(service.id, "OPENAI_VISION_MODEL", model)
console.log("  OK: OPENAI_VISION_MODEL =", model)

console.log("\nDisparando deploy…")
const deploy = await triggerDeploy(service.id)
console.log("Deploy:", deploy.id ?? deploy.deploy?.id ?? "(ver painel)")

console.log("\nAguarde 3–5 min e valide:")
console.log("  npm run validate:nutrition")
console.log("\n=== Concluído ===")
