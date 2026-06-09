/**
 * Aguarda validação MP no Chrome CDP → APP_USR → .env → Render → validações.
 * Sem prompts interativos.
 */
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { spawnSync } from "node:child_process"
import { chromium } from "playwright"
import { loadProjectEnv } from "./env-loader.mjs"

const LOCAL = resolve(".mercadopago.local.env")
const MAX_WAIT_MS = 20 * 60 * 1000

loadProjectEnv()

function hasToken() {
  if (existsSync(LOCAL)) {
    for (const line of readFileSync(LOCAL, "utf8").split(/\r?\n/)) {
      if (line.startsWith("MERCADOPAGO_ACCESS_TOKEN=APP_USR-")) return true
    }
  }
  return process.env.MERCADOPAGO_ACCESS_TOKEN?.startsWith("APP_USR-")
}

function run(args) {
  const r = spawnSync("node", args, { stdio: "inherit", shell: true, cwd: process.cwd() })
  if (r.status !== 0) process.exit(r.status ?? 1)
}

async function isChallenge(url) {
  return (
    url.includes("phone-validation") ||
    url.includes("method-selector") ||
    url.includes("totp-in-app") ||
    url.includes("user-legal-id") ||
    url.includes("auth.mercadolibre")
  )
}

async function main() {
  console.log("=== MP: aguardar validação + pipeline completo ===\n")

  if (!hasToken()) {
    const browser = await chromium.connectOverCDP("http://127.0.0.1:9222", { timeout: 15000 })
    const ctx = browser.contexts()[0]
    let page = ctx.pages().find((p) => /mercadopago|mercadolibre/.test(p.url())) ?? ctx.pages()[0]
    const end = Date.now() + MAX_WAIT_MS
    let lastLog = 0

    while (Date.now() < end && !hasToken()) {
      page = ctx.pages().find((p) => /mercadopago|mercadolibre/.test(p.url())) ?? page
      const url = page.url()

      if (await isChallenge(url)) {
        const alt = page.getByRole("button", { name: /verificar de outra forma/i }).first()
        if (await alt.isVisible({ timeout: 1000 }).catch(() => false)) await alt.click().catch(() => {})
      } else if (url.includes("developers/panel")) {
        if (Date.now() - lastLog > 15000) {
          console.log("✓ Painel MP acessível — extraindo credenciais…")
          lastLog = Date.now()
        }
        await browser.close().catch(() => {})
        run(["./scripts/mp-cdp-full.mjs"])
        break
      }

      if (Date.now() - lastLog > 30000) {
        console.log("  aguardando aprovação MP…", url.slice(0, 85))
        lastLog = Date.now()
      }
      await page.waitForTimeout(3000)
    }

    await browser.close().catch(() => {})

    if (!hasToken()) {
      run(["./scripts/mp-create-app-cdp.mjs"])
    }
  }

  if (!hasToken()) {
    console.error("\n✗ Token APP_USR- não obtido após aguardar validação Mercado Pago.")
    process.exit(1)
  }

  run(["./scripts/apply-mp-to-env.mjs"])
  loadProjectEnv()
  run(["./scripts/render-sync-mercadopago.mjs"])
  run(["./scripts/wait-render-deploy.mjs"])
  run(["./scripts/validate-mercadopago-production.mjs"])
  run(["./scripts/validate-premium.mjs"])
  console.log("\n✓ Pipeline Mercado Pago concluído.")
}

main().catch((e) => {
  console.error("✗", e.message)
  process.exit(1)
})
