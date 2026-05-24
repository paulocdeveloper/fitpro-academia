/**
 * Finaliza IA nutricional: .env → Render → deploy → validação E2E.
 *
 * Requer no .env local OU variáveis de ambiente:
 *   OPENAI_API_KEY
 *   RENDER_API_KEY (Render Dashboard → API Keys)
 *
 * Uso:
 *   npm run finalize:openai
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { spawnSync } from "node:child_process"

const API = "https://api.render.com/v1"
const SERVICE_NAME = "fitpro-academia"
const BASE = process.env.PROD_URL ?? "https://fitpro-academia.onrender.com"
const ENV_PATH = resolve(process.cwd(), ".env")
const ENV_LOCAL_PATH = resolve(process.cwd(), ".env.local")

function loadDotEnv() {
  const out = {}
  for (const p of [ENV_PATH, ENV_LOCAL_PATH]) {
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

function ensureEnvLocal(openaiKey, model) {
  let content = existsSync(ENV_PATH) ? readFileSync(ENV_PATH, "utf8") : ""
  const lines = content.split(/\r?\n/)
  const hasOpenAI = lines.some((l) => l.startsWith("OPENAI_API_KEY="))
  const hasModel = lines.some((l) => l.startsWith("OPENAI_VISION_MODEL="))
  const append = []
  if (!hasOpenAI) append.push(`OPENAI_API_KEY=${openaiKey}`)
  if (!hasModel) append.push(`OPENAI_VISION_MODEL=${model}`)
  if (append.length) {
    if (content && !content.endsWith("\n")) content += "\n"
    content += append.join("\n") + "\n"
    writeFileSync(ENV_PATH, content, "utf8")
    console.log("  .env local atualizado (OPENAI_* adicionado)")
  }
}

async function renderApi(path, renderKey, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${renderKey}`,
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

async function findService(renderKey) {
  let cursor = null
  do {
    const q = cursor ? `?limit=100&cursor=${cursor}` : "?limit=100"
    const data = await renderApi(`/services${q}`, renderKey)
    for (const item of data) {
      const s = item.service ?? item
      if (s.name === SERVICE_NAME || s.slug === SERVICE_NAME) return s
    }
    cursor = data.length ? data[data.length - 1]?.cursor : null
  } while (cursor)
  throw new Error(`Serviço "${SERVICE_NAME}" não encontrado`)
}

async function syncRender(openaiKey, model, renderKey) {
  const service = await findService(renderKey)
  console.log("Serviço Render:", service.name, service.id)

  await renderApi(`/services/${service.id}/env-vars/${encodeURIComponent("OPENAI_API_KEY")}`, renderKey, {
    method: "PUT",
    body: JSON.stringify({ value: openaiKey }),
  })
  console.log("  OK: OPENAI_API_KEY")

  await renderApi(`/services/${service.id}/env-vars/${encodeURIComponent("OPENAI_VISION_MODEL")}`, renderKey, {
    method: "PUT",
    body: JSON.stringify({ value: model }),
  })
  console.log("  OK: OPENAI_VISION_MODEL =", model)

  const deploy = await renderApi(`/services/${service.id}/deploys`, renderKey, {
    method: "POST",
    body: JSON.stringify({ clearCache: "clear" }),
  })
  console.log("Deploy iniciado:", deploy.id ?? deploy.deploy?.id ?? "(painel)")
  return service.id
}

async function waitForVision(maxAttempts = 20) {
  for (let i = 1; i <= maxAttempts; i++) {
    const health = await fetch(`${BASE}/api/health`).then((r) => r.json()).catch(() => null)
    if (health?.env?.OPENAI_API_KEY_set) {
      console.log(`\n✓ Vision ativa após tentativa ${i}`)
      return true
    }
    console.log(`  aguardando deploy… ${i}/${maxAttempts}`)
    await new Promise((r) => setTimeout(r, 15000))
  }
  return false
}

function runValidateE2E() {
  const r = spawnSync("node", ["scripts/validate-nutrition-e2e.mjs"], {
    stdio: "inherit",
    env: process.env,
  })
  return r.status === 0
}

const fileEnv = loadDotEnv()
const openaiKey = (process.env.OPENAI_API_KEY || fileEnv.OPENAI_API_KEY || "").trim()
const renderKey = (process.env.RENDER_API_KEY || fileEnv.RENDER_API_KEY || "").trim()
const model = (process.env.OPENAI_VISION_MODEL || fileEnv.OPENAI_VISION_MODEL || "gpt-4o").trim()

console.log("=== Finalizar IA Nutricional (OpenAI Vision) ===\n")

if (!openaiKey) {
  console.error("✗ OPENAI_API_KEY ausente no disco.")
  console.error(`  Arquivo: ${ENV_PATH}`)
  console.error("  Chaves encontradas:", Object.keys(loadDotEnv()).join(", ") || "(nenhuma)")
  console.error("\n  Se você editou o .env no Cursor, salve com Ctrl+S e rode novamente.")
  console.error("  Linhas necessárias:")
  console.error("    OPENAI_API_KEY=sk-...")
  console.error("    OPENAI_VISION_MODEL=gpt-4o")
  console.error("    RENDER_API_KEY=rnd_...  (Render → Account → API Keys)")
  process.exit(1)
}

async function productionHasOpenAI() {
  const health = await fetch(`${BASE}/api/health`).then((r) => r.json()).catch(() => null)
  return Boolean(health?.env?.OPENAI_API_KEY_set)
}

if (!renderKey) {
  if (await productionHasOpenAI()) {
    console.log("~ RENDER_API_KEY ausente, mas Vision já está no Render — pulando sync\n")
  } else {
    console.error("✗ RENDER_API_KEY ausente e Vision não está no Render.")
    console.error("  Opção A — adicione ao .env:")
    console.error("    RENDER_API_KEY=rnd_...")
    console.error("  Opção B — Render Dashboard → fitpro-academia → Environment:")
    console.error("    OPENAI_API_KEY + OPENAI_VISION_MODEL=gpt-4o → Manual Deploy")
    console.error("  Crie API key: https://dashboard.render.com/u/settings#api-keys")
    process.exit(1)
  }
} else {
  ensureEnvLocal(openaiKey, model)
  console.log("\n1) Sincronizando Render…")
  await syncRender(openaiKey, model, renderKey)
}

if (!(await productionHasOpenAI())) {
  console.log("\n2) Aguardando deploy…")
  const ready = await waitForVision()
  if (!ready) {
    console.error("✗ Timeout aguardando OPENAI_API_KEY_set em /api/health")
    process.exit(1)
  }
} else {
  console.log("\n✓ Vision já ativa em produção")
}

console.log("\n3) Validação E2E…")
const ok = runValidateE2E()
if (!ok) process.exit(1)

console.log("\n4) Validação scanner mobile…")
const mobile = spawnSync("node", ["scripts/validate-scanner-mobile.mjs"], { stdio: "inherit" })
if (mobile.status !== 0) process.exit(1)

console.log("\n=== IA Nutricional FINALIZADA ===")
console.log(`Preview: ${BASE}/dietas`)
