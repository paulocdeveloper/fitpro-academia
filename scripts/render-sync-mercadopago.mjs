/**
 * Sincroniza credenciais Mercado Pago do .env local → Render + deploy (clear cache).
 */
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { loadProjectEnv } from "./env-loader.mjs"

const API = "https://api.render.com/v1"
const SERVICE_NAME = "fitpro-academia"
const SERVICE_ID = "srv-d85h823rjlhs73e0pa80"

loadProjectEnv()

function loadExtraEnv() {
  const paths = [
    resolve(process.cwd(), ".env"),
    resolve(process.cwd(), ".mercadopago.local.env"),
    resolve(process.cwd(), ".env.local"),
  ]
  const out = {}
  for (const p of paths) {
    if (!existsSync(p)) continue
    for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
      const t = line.trim()
      if (!t || t.startsWith("#")) continue
      const eq = t.indexOf("=")
      if (eq < 1) continue
      out[t.slice(0, eq).trim()] = t.slice(eq + 1).trim()
    }
  }
  return out
}

function resolveMpCredentials() {
  const extra = loadExtraEnv()
  const token = (
    process.env.MERCADOPAGO_ACCESS_TOKEN ||
    process.env.MINHA_CHAVE_MP ||
    extra.MERCADOPAGO_ACCESS_TOKEN ||
    extra.MINHA_CHAVE_MP ||
    ""
  ).trim()
  const webhookSecret = (
    process.env.MERCADOPAGO_WEBHOOK_SECRET || extra.MERCADOPAGO_WEBHOOK_SECRET || ""
  ).trim()
  return { token, webhookSecret }
}

async function api(path, options = {}) {
  const key = process.env.RENDER_API_KEY?.trim()
  if (!key) throw new Error("RENDER_API_KEY ausente")
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
    throw new Error(`Render API ${res.status}: ${typeof body === "string" ? body : JSON.stringify(body)}`)
  }
  return body
}

async function findService() {
  try {
    const s = await api(`/services/${SERVICE_ID}`)
    if (s?.id) return s
  } catch {
    /* fallback list */
  }
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
  if (!value?.trim()) return
  await api(`/services/${serviceId}/env-vars/${encodeURIComponent(key)}`, {
    method: "PUT",
    body: JSON.stringify({ value }),
  })
}

async function main() {
  const { token, webhookSecret } = resolveMpCredentials()
  if (!token) {
    throw new Error(
      "MERCADOPAGO_ACCESS_TOKEN ausente. Defina no .env, .mercadopago.local.env ou MINHA_CHAVE_MP",
    )
  }

  console.log("=== Render: sincronizar Mercado Pago ===\n")
  const service = await findService()
  console.log("Serviço:", service.name, `(${service.id})`)

  await setEnvVar(service.id, "MERCADOPAGO_ACCESS_TOKEN", token)
  console.log("  OK: MERCADOPAGO_ACCESS_TOKEN", `(${token.slice(0, 12)}…)`)

  await setEnvVar(service.id, "MERCADOPAGO_USE_MOCK", "false")
  console.log("  OK: MERCADOPAGO_USE_MOCK=false (cobrança real)")

  if (webhookSecret) {
    await setEnvVar(service.id, "MERCADOPAGO_WEBHOOK_SECRET", webhookSecret)
    console.log("  OK: MERCADOPAGO_WEBHOOK_SECRET")
  } else {
    console.log("  ~ MERCADOPAGO_WEBHOOK_SECRET omitido (configure no painel MP → Webhooks)")
  }

  console.log("\nDisparando deploy (clear build cache)…")
  const deploy = await api(`/services/${service.id}/deploys`, {
    method: "POST",
    body: JSON.stringify({ clearCache: "clear" }),
  })
  console.log("Deploy:", deploy.id ?? deploy.deploy?.id ?? "(ver painel)")
  console.log("\n=== Concluído ===")
}

main().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
