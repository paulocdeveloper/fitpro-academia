/**
 * Configura Mercado Pago no Render via dashboard (Playwright + sessão persistente).
 * Lê token do .env / .mercadopago.local.env ou tenta copiar do painel MP.
 *
 * Uso:
 *   npm run render:browser:mercadopago
 *   npm run render:browser:mercadopago -- --interactive
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { createInterface } from "node:readline"
import { chromium } from "playwright"
import { loadProjectEnv } from "./env-loader.mjs"

const SERVICE = "fitpro-academia"
const PROFILE = resolve(process.cwd(), ".render-browser-profile")
const SCREENSHOTS = resolve(PROFILE, "shots-mp")
const INTERACTIVE = process.argv.includes("--interactive")
const LOCAL_ENV = resolve(process.cwd(), ".mercadopago.local.env")

loadProjectEnv()

function loadLocalMp() {
  const fromEnv = {
    token: (
      process.env.MERCADOPAGO_ACCESS_TOKEN?.trim() ||
      process.env.MINHA_CHAVE_MP?.trim() ||
      ""
    ),
    webhook: process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim() || "",
  }
  if (fromEnv.token) return fromEnv
  if (!existsSync(LOCAL_ENV)) return fromEnv
  const out = { token: "", webhook: "" }
  for (const line of readFileSync(LOCAL_ENV, "utf8").split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith("#")) continue
    const eq = t.indexOf("=")
    if (eq < 1) continue
    const k = t.slice(0, eq).trim()
    const v = t.slice(eq + 1).trim()
    if (k === "MERCADOPAGO_ACCESS_TOKEN" || k === "MINHA_CHAVE_MP") out.token = v
    if (k === "MERCADOPAGO_WEBHOOK_SECRET") out.webhook = v
  }
  return out
}

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
  mkdirSync(SCREENSHOTS, { recursive: true })
  const p = resolve(SCREENSHOTS, `${Date.now()}-${name}.png`)
  await page.screenshot({ path: p, fullPage: true }).catch(() => {})
  console.log("  screenshot:", p)
}

function isAuthUrl(url) {
  return (
    url.includes("login") ||
    url.includes("github.com") ||
    url.includes("google.com") ||
    url.includes("accounts.google") ||
    url.includes("auth.mercadolibre")
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
        (await page.getByText(/fitpro-academia|projects|services/i).first().isVisible().catch(() => false)) ||
        (await page.locator(`a[href*="${SERVICE}"]`).first().isVisible().catch(() => false))
      if (ready) {
        console.log("✓ Dashboard Render autenticado")
        return
      }
    }
    await page.waitForTimeout(3000)
  }
  throw new Error("Timeout login Render (10 min)")
}

async function scrapeMpToken(context) {
  console.log("\nTentando obter Access Token no painel Mercado Pago…")
  const page = await context.newPage()
  try {
    await page.goto("https://www.mercadopago.com.br/developers/panel/app", {
      waitUntil: "domcontentloaded",
      timeout: 120000,
    })
    const loginDeadline = Date.now() + 5 * 60 * 1000
    while (Date.now() < loginDeadline) {
      const url = page.url()
      if (!url.includes("auth.mercadolibre") && !url.includes("login")) break
      console.log("  aguardando login Mercado Pago…")
      await page.waitForTimeout(3000)
    }
    await page.waitForTimeout(3000)

    const cred = page.getByRole("link", { name: /credenciais|credentials/i }).first()
    if (await cred.isVisible({ timeout: 15000 }).catch(() => false)) {
      await cred.click()
      await page.waitForTimeout(2000)
    }

    const prodTab = page.getByText(/^produção$|^production$/i).first()
    if (await prodTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await prodTab.click()
      await page.waitForTimeout(1500)
    }

    const copyBtn = page.getByRole("button", { name: /copiar|copy/i }).first()
    if (await copyBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
      await context.grantPermissions(["clipboard-read", "clipboard-write"])
      await copyBtn.click()
      await page.waitForTimeout(500)
      const clip = await page.evaluate(async () => {
        try {
          return await navigator.clipboard.readText()
        } catch {
          return ""
        }
      })
      if (clip?.startsWith("APP_USR-") || clip?.startsWith("TEST-")) {
        console.log("✓ Token MP copiado do painel")
        return clip.trim()
      }
    }

    const inputs = page.locator('input[readonly], input[type="text"], code')
    const n = await inputs.count()
    for (let i = 0; i < n; i++) {
      const v = (await inputs.nth(i).inputValue().catch(() => "")) ||
        (await inputs.nth(i).textContent().catch(() => "")) ||
        ""
      const t = v.trim()
      if (t.startsWith("APP_USR-") || t.startsWith("TEST-")) {
        console.log("✓ Token MP lido do painel")
        return t
      }
    }
  } finally {
    await page.close().catch(() => {})
  }
  return ""
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

async function main() {
  console.log("=== Render Browser: Mercado Pago Premium ===\n")

  let { token, webhook } = loadLocalMp()
  if (!token && INTERACTIVE) {
    await askEnter(
      "Cole MERCADOPAGO_ACCESS_TOKEN no .mercadopago.local.env e pressione ENTER, ou ENTER para tentar painel MP…\n",
    )
    ;({ token, webhook } = loadLocalMp())
  }

  const context = await chromium.launchPersistentContext(PROFILE, {
    headless: false,
    viewport: { width: 1440, height: 900 },
    slowMo: 60,
  })

  const page = context.pages()[0] ?? (await context.newPage())

  try {
    if (!token) {
      token = await scrapeMpToken(context)
      if (token) {
        const lines = [
          "# gerado pelo render-browser-mercadopago — não commitar",
          `MERCADOPAGO_ACCESS_TOKEN=${token}`,
        ]
        if (webhook) lines.push(`MERCADOPAGO_WEBHOOK_SECRET=${webhook}`)
        writeFileSync(LOCAL_ENV, lines.join("\n") + "\n", "utf8")
        console.log("  salvo em .mercadopago.local.env")
      }
    }

    if (!token) {
      console.warn("\n⚠ Token MP não obtido automaticamente.")
      console.warn("  Crie o arquivo .mercadopago.local.env com:")
      console.warn("  MERCADOPAGO_ACCESS_TOKEN=APP_USR-...")
      console.warn("  MERCADOPAGO_WEBHOOK_SECRET=... (opcional)\n")
      throw new Error("Token MP ausente — configure .mercadopago.local.env")
    }

    if (INTERACTIVE) {
      await page.goto(`https://dashboard.render.com/`, { waitUntil: "domcontentloaded" })
      await askEnter("\nPressione ENTER na aba Environment do fitpro-academia…\n")
    } else {
      await waitForDashboard(page)
      await openService(page)
      await openEnvironmentTab(page)
    }

    await snap(page, "env-before")
    await upsertEnvVar(page, "MERCADOPAGO_ACCESS_TOKEN", token)
    if (webhook) await upsertEnvVar(page, "MERCADOPAGO_WEBHOOK_SECRET", webhook)
    await snap(page, "env-after")
    await saveAndDeploy(page)
    await snap(page, "deploy")
    await context.close()

    console.log("\n✓ Render configurado — rode: npm run finalize:mercadopago")
    process.exit(0)
  } catch (e) {
    await snap(page, "error")
    console.error("\n✗ Erro:", e.message)
    console.error("\nAlternativa API: crie .mercadopago.local.env e rode npm run render:mercadopago")
    process.exit(1)
  }
}

main()
