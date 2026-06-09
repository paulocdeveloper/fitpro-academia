/**
 * Pipeline 100% automático: MP token → Render → deploy → validações.
 */
import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import { resolve } from "node:path"
import { loadProjectEnv } from "./env-loader.mjs"
import { readFileSync, writeFileSync } from "node:fs"

const BASE = process.env.PROD_URL ?? "https://fitpro-academia.onrender.com"
const LOCAL_ENV = resolve(process.cwd(), ".mercadopago.local.env")

loadProjectEnv()

function run(label, cmd, args) {
  console.log(`\n--- ${label} ---`)
  const r = spawnSync(cmd, args, { stdio: "inherit", shell: true, cwd: process.cwd() })
  if (r.status !== 0) throw new Error(`${label} falhou (${r.status})`)
}

function hasToken() {
  return (
    process.env.MERCADOPAGO_ACCESS_TOKEN?.trim()?.startsWith("APP_USR-") ||
    process.env.MINHA_CHAVE_MP?.trim()?.startsWith("APP_USR-") ||
    existsSync(LOCAL_ENV)
  )
}

async function waitMpLive(max = 45) {
  console.log("\n--- Aguardando MP em produção ---")
  for (let i = 1; i <= max; i++) {
    const health = await fetch(`${BASE}/api/health`).then((r) => r.json()).catch(() => null)
    const ok = health?.env?.MERCADOPAGO_ACCESS_TOKEN_set === true
    console.log(`  [${i}/${max}] MERCADOPAGO_ACCESS_TOKEN_set=${ok}`)
    if (ok) return
    await new Promise((r) => setTimeout(r, 15000))
  }
  throw new Error("Timeout: MP não apareceu no health")
}

async function main() {
  console.log("=== Auto Mercado Pago → Render → Validação ===\n")

  if (!process.env.RENDER_API_KEY?.trim()) {
    throw new Error("RENDER_API_KEY ausente (~/.render/cli.yaml ou .env)")
  }

  if (!hasToken()) {
    run("Scrape APP_USR (Mercado Pago)", "node", ["./scripts/mp-scrape-production-token.mjs"])
    if (existsSync(LOCAL_ENV)) {
      for (const line of readFileSync(LOCAL_ENV, "utf8").split(/\r?\n/)) {
        if (line.startsWith("MERCADOPAGO_ACCESS_TOKEN=")) {
          process.env.MERCADOPAGO_ACCESS_TOKEN = line.slice("MERCADOPAGO_ACCESS_TOKEN=".length).trim()
        }
      }
    }
    if (!process.env.MERCADOPAGO_ACCESS_TOKEN?.startsWith("APP_USR-")) {
      throw new Error("Falha ao obter APP_USR- do painel Mercado Pago")
    }
    console.log("✓ Token obtido:", process.env.MERCADOPAGO_ACCESS_TOKEN.slice(0, 16) + "…")
  } else {
    console.log("✓ Token MP já disponível localmente")
  }

  run("Sync Render (API)", "node", ["./scripts/render-sync-mercadopago.mjs"])
  run("Deploy + clear cache", "node", ["./scripts/wait-render-deploy.mjs"])

  await waitMpLive()

  run("Premium", "node", ["./scripts/validate-premium.mjs"])
  run("Mercado Pago", "node", ["./scripts/validate-mercadopago-production.mjs"])
  run("Permissões", "node", ["./scripts/validate-permissions.mjs"])
  run("Scanner mobile", "node", ["./scripts/validate-scanner-mobile.mjs"])
  run("SEO", "node", ["./scripts/validate-seo.mjs"])

  const health = await fetch(`${BASE}/api/health`).then((r) => r.json())
  console.log("\n=== Produção online ===")
  console.log("URL:", BASE)
  console.log("Supabase:", health?.ok ? "OK" : "ERRO")
  console.log("MP:", health?.env?.MERCADOPAGO_ACCESS_TOKEN_set ? "OK" : "PENDENTE")
  console.log("\n✓ Pipeline concluído.")
}

main().catch((e) => {
  console.error("\n✗", e.message)
  process.exit(1)
})
