/**
 * Finaliza Premium Mercado Pago: credenciais → Render → deploy → validações.
 *
 * Uso: npm run finalize:mercadopago
 */
import { existsSync } from "node:fs"
import { resolve } from "node:path"
import { spawnSync } from "node:child_process"
import { loadProjectEnv } from "./env-loader.mjs"

const BASE = process.env.PROD_URL ?? "https://fitpro-academia.onrender.com"
const LOCAL_MP = resolve(process.cwd(), ".mercadopago.local.env")

loadProjectEnv()

function hasMpToken() {
  return Boolean(
    process.env.MERCADOPAGO_ACCESS_TOKEN?.trim() ||
      process.env.MINHA_CHAVE_MP?.trim() ||
      existsSync(LOCAL_MP),
  )
}

function run(cmd, args, label) {
  console.log(`\n--- ${label} ---`)
  const r = spawnSync(cmd, args, { stdio: "inherit", shell: true, cwd: process.cwd() })
  if (r.status !== 0) {
    console.error(`✗ ${label} falhou (code ${r.status})`)
    process.exit(r.status ?? 1)
  }
}

async function waitForMpCheckout(max = 40) {
  console.log("\n--- Aguardando MERCADOPAGO no Render ---")
  for (let i = 1; i <= max; i++) {
    const res = await fetch(`${BASE}/api/subscription/status`, { redirect: "manual" })
    if (res.status === 401) {
      console.log(`  [${i}] API ok (auth required)`)
      break
    }
    const health = await fetch(`${BASE}/api/health`).then((r) => r.json()).catch(() => null)
    const configured = health?.env?.MERCADOPAGO_ACCESS_TOKEN_set
    console.log(`  [${i}/${max}] MERCADOPAGO_ACCESS_TOKEN_set=${configured}`)
    if (configured) {
      console.log("✓ Mercado Pago configurado em produção")
      return
    }
    await new Promise((r) => setTimeout(r, 15000))
  }
}

async function main() {
  console.log("=== Finalizar Premium Mercado Pago em produção ===\n")

  if (!process.env.RENDER_API_KEY?.trim()) {
    console.error("✗ RENDER_API_KEY ausente (sessão CLI ~/.render/cli.yaml ou .env)")
    process.exit(1)
  }

  if (!hasMpToken()) {
    console.log("Token MP ausente — extraindo do painel Mercado Pago (browser)…\n")
    run("node", ["./scripts/mp-scrape-production-token.mjs"], "Scrape APP_USR produção")
    loadProjectEnv()
  }

  if (!hasMpToken()) {
    console.error(
      "✗ Defina MERCADOPAGO_ACCESS_TOKEN em .mercadopago.local.env (gitignored) e rode de novo.",
    )
    process.exit(1)
  }

  run("node", ["./scripts/render-sync-mercadopago.mjs"], "Sync env → Render API")
  run("node", ["./scripts/wait-render-deploy.mjs"], "Aguardar deploy live")

  await waitForMpCheckout()

  run("node", ["./scripts/validate-premium.mjs"], "Validar Premium")
  run("node", ["./scripts/validate-mercadopago-production.mjs"], "Validar MP + webhook")
  run("node", ["./scripts/validate-permissions.mjs"], "Validar roles")
  run("node", ["./scripts/validate-scanner-mobile.mjs"], "Validar scanner mobile")
  run("node", ["./scripts/validate-seo.mjs"], "Validar SEO")

  const health = await fetch(`${BASE}/api/health`).then((r) => r.json()).catch(() => null)
  console.log("\n=== Produção ===")
  console.log("URL:", BASE)
  console.log("Health:", health?.status ?? "?")
  console.log("MP:", health?.env?.MERCADOPAGO_ACCESS_TOKEN_set ? "configurado" : "pendente")
  console.log("\n✓ Finalização Mercado Pago concluída.")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
