/**
 * Configura OpenAI Vision no Render via dashboard (Playwright).
 * Perfil persistente: .render-browser-profile
 *
 * Uso:
 *   npm run render:browser:openai
 *   npm run render:browser:openai -- --interactive   (pausa após login manual)
 */
import { existsSync, mkdirSync } from "node:fs"
import { resolve } from "node:path"
import { createInterface } from "node:readline"
import { chromium } from "playwright"
import { loadProjectEnv } from "./env-loader.mjs"

const BASE = process.env.PROD_URL ?? "https://fitpro-academia.onrender.com"
const SERVICE = "fitpro-academia"
const PROFILE = resolve(process.cwd(), ".render-browser-profile")
const SCREENSHOTS = resolve(PROFILE, "shots")
const INTERACTIVE = process.argv.includes("--interactive")

loadProjectEnv()

const OPENAI_API_KEY = process.env.OPENAI_API_KEY?.trim()
const OPENAI_VISION_MODEL = process.env.OPENAI_VISION_MODEL?.trim() || "gpt-4o"

if (!OPENAI_API_KEY) {
  console.error("✗ OPENAI_API_KEY ausente no .env")
  process.exit(1)
}

mkdirSync(SCREENSHOTS, { recursive: true })

function askEnter(msg) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout })
    rl.question(msg, () => {
      rl.close()
      resolve()
    })
  })
}

async function snap(page, name) {
  const p = resolve(SCREENSHOTS, `${Date.now()}-${name}.png`)
  await page.screenshot({ path: p, fullPage: true }).catch(() => {})
  console.log("  screenshot:", p)
}

function isAuthUrl(url) {
  return (
    url.includes("login") ||
    url.includes("github.com") ||
    url.includes("google.com") ||
    url.includes("accounts.google")
  )
}

async function waitForDashboard(page) {
  console.log("Abrindo dashboard.render.com …")
  await page.goto("https://dashboard.render.com/", { waitUntil: "domcontentloaded", timeout: 120000 })

  const deadline = Date.now() + 10 * 60 * 1000
  while (Date.now() < deadline) {
    const url = page.url()
    if (!isAuthUrl(url) && url.includes("dashboard.render.com")) {
      const ready =
        (await page.getByText(/fitpro-academia|projects|services|new web service/i).first().isVisible().catch(() => false)) ||
        (await page.locator(`a[href*="${SERVICE}"]`).first().isVisible().catch(() => false))
      if (ready) {
        console.log("✓ Dashboard Render autenticado")
        return
      }
    }
    if (Date.now() % 15000 < 4000) {
      console.log("  aguardando login… (complete GitHub/Google no browser aberto)")
    }
    await page.waitForTimeout(3000)
  }
  throw new Error("Timeout de login (10 min). Use --interactive ou RENDER_API_KEY.")
}

async function openService(page) {
  const link = page.locator(`a[href*="${SERVICE}"], a:has-text("${SERVICE}")`).first()
  if (await link.isVisible({ timeout: 15000 }).catch(() => false)) {
    await link.click()
  } else {
    const search = page.locator('input[placeholder*="Search" i], input[type="search"]').first()
    if (await search.isVisible({ timeout: 5000 }).catch(() => false)) {
      await search.fill(SERVICE)
      await page.waitForTimeout(1500)
    }
    await page.getByRole("link", { name: new RegExp(SERVICE, "i") }).first().click({ timeout: 90000 })
  }
  await page.waitForLoadState("domcontentloaded")
  console.log("✓ Serviço", SERVICE)
}

async function openEnvironmentTab(page) {
  const envLink = page.getByRole("link", { name: /^environment$/i }).first()
  if (await envLink.isVisible({ timeout: 10000 }).catch(() => false)) {
    await envLink.click()
  } else {
    await page.getByText(/^environment$/i).first().click({ timeout: 30000 })
  }
  await page.waitForTimeout(2000)
  console.log("✓ Aba Environment")
}

async function upsertEnvVar(page, key, value) {
  const row = page.locator("tr, [class*='env'], [data-testid*='env']").filter({ hasText: key }).first()
  if (await row.isVisible({ timeout: 4000 }).catch(() => false)) {
    const edit = row.getByRole("button", { name: /edit|change|update/i }).first()
    if (await edit.isVisible({ timeout: 3000 }).catch(() => false)) await edit.click()
    else await row.click()
    await page.locator('input[type="password"], input[type="text"], textarea').last().fill(value)
    const saveRow = page.getByRole("button", { name: /^save$/i }).last()
    if (await saveRow.isVisible({ timeout: 3000 }).catch(() => false)) await saveRow.click()
    console.log(`  atualizado: ${key}`)
    await page.waitForTimeout(1500)
    return
  }

  await page.getByRole("button", { name: /add environment variable|add variable|add env/i }).first().click({ timeout: 30000 })
  await page.waitForTimeout(500)
  const inputs = page.locator('input[type="text"], input:not([type="hidden"])')
  const count = await inputs.count()
  if (count >= 2) {
    await inputs.nth(count - 2).fill(key)
    await inputs.nth(count - 1).fill(value)
  } else {
    await page.getByPlaceholder(/key|name/i).first().fill(key)
    await page.getByPlaceholder(/value/i).first().fill(value)
  }
  await page.getByRole("button", { name: /save|add|create/i }).last().click({ timeout: 15000 })
  console.log(`  adicionado: ${key}`)
  await page.waitForTimeout(2000)
}

async function saveAndDeploy(page) {
  const saveRebuild = page.getByRole("button", { name: /save.*rebuild|save.*deploy|save changes/i }).first()
  if (await saveRebuild.isVisible({ timeout: 5000 }).catch(() => false)) {
    await saveRebuild.click()
    console.log("✓ Save + rebuild acionado")
    return
  }
  await page.getByRole("button", { name: /manual deploy/i }).first().click({ timeout: 30000 })
  await page.waitForTimeout(500)
  const clearCache = page.getByRole("menuitem", { name: /clear build cache/i }).first()
  if (await clearCache.isVisible({ timeout: 5000 }).catch(() => false)) {
    await clearCache.click()
    console.log("✓ Manual Deploy → Clear build cache")
  } else {
    await page.getByRole("menuitem", { name: /deploy latest|deploy/i }).first().click({ timeout: 10000 })
    console.log("✓ Manual Deploy acionado")
  }
}

async function waitForProductionVision(maxAttempts = 24) {
  console.log("\nAguardando Vision em produção…")
  for (let i = 1; i <= maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 15000))
    const health = await fetch(`${BASE}/api/health`).then((r) => r.json()).catch(() => null)
  const keySet = health?.env?.OPENAI_API_KEY_set
    console.log(`  [${i}/${maxAttempts}] OPENAI_API_KEY_set=${keySet}`)
    if (keySet) {
      console.log("✓ Vision configurada em /api/health")
      return true
    }
  }
  return false
}

async function main() {
  console.log("=== Render Browser: OpenAI Vision ===\n")

  const context = await chromium.launchPersistentContext(PROFILE, {
    headless: false,
    viewport: { width: 1440, height: 900 },
    slowMo: 80,
  })

  const page = context.pages()[0] ?? (await context.newPage())

  try {
    if (INTERACTIVE) {
      await page.goto("https://dashboard.render.com/", { waitUntil: "domcontentloaded" })
      console.log("\nModo interativo:")
      console.log("  1. Faça login no browser")
      console.log(`  2. Abra o serviço ${SERVICE} → Environment`)
      await askEnter("\nPressione ENTER quando estiver na aba Environment…\n")
    } else {
      await waitForDashboard(page)
      await openService(page)
      await openEnvironmentTab(page)
    }

    await snap(page, "environment-before")
    await upsertEnvVar(page, "OPENAI_API_KEY", OPENAI_API_KEY)
    await upsertEnvVar(page, "OPENAI_VISION_MODEL", OPENAI_VISION_MODEL)
    await snap(page, "environment-after")
    await saveAndDeploy(page)
    await snap(page, "deploy")
    await context.close()

    const ok = await waitForProductionVision()
    if (!ok) process.exit(1)

    console.log("\n✓ Render configurado — executando validações…")
    process.exit(0)
  } catch (e) {
    await snap(page, "error")
    console.error("\n✗ Erro:", e.message)
    console.error("\nAlternativas:")
    console.error("  A) npm run render:browser:openai -- --interactive")
    console.error("  B) Adicione RENDER_API_KEY ao .env e rode: npm run finalize:openai")
    console.error("  C) Render Dashboard → Environment → cole OPENAI_* → Manual Deploy")
    console.error("\nBrowser permanece aberto para login manual.")
    process.exit(1)
  }
}

main()
