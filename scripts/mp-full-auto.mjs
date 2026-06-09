/**
 * Pipeline completo: token MP → .env → Render → deploy → validações.
 * Requer Chrome CDP (9222) com sessão MP ou .mercadopago.local.env.
 */
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { spawnSync } from "node:child_process"
import { loadProjectEnv } from "./env-loader.mjs"

const LOCAL = resolve(".mercadopago.local.env")

loadProjectEnv()

function run(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: "inherit", shell: true, cwd: process.cwd() })
  if (r.status !== 0) process.exit(r.status ?? 1)
}

function hasToken() {
  if (existsSync(LOCAL)) {
    for (const line of readFileSync(LOCAL, "utf8").split(/\r?\n/)) {
      if (line.startsWith("MERCADOPAGO_ACCESS_TOKEN=APP_USR-")) return true
    }
  }
  return process.env.MERCADOPAGO_ACCESS_TOKEN?.startsWith("APP_USR-")
}

async function main() {
  console.log("=== MP Full Auto ===\n")

  if (!hasToken()) {
    run("node", ["./scripts/mp-cdp-full.mjs"])
    if (!hasToken()) run("node", ["./scripts/mp-cdp-extract-now.mjs"])
    if (!hasToken()) run("node", ["./scripts/mp-cdp-wait-token.mjs"])
  }

  if (!hasToken()) {
    console.error("✗ Token APP_USR- indisponível. Sessão MP no Chrome CDP (9222) aguarda validação.")
    process.exit(1)
  }

  run("node", ["./scripts/apply-mp-to-env.mjs"])
  loadProjectEnv()
  run("node", ["./scripts/render-sync-mercadopago.mjs"])
  run("node", ["./scripts/wait-render-deploy.mjs"])
  run("node", ["./scripts/validate-mercadopago-production.mjs"])
  run("node", ["./scripts/validate-premium.mjs"])
  run("node", ["./scripts/validate-permissions.mjs"])
  run("node", ["./scripts/validate-scanner-mobile.mjs"])
  run("node", ["./scripts/validate-seo.mjs"])

  console.log("\n✓ Pipeline MP concluído.")
}

main()
