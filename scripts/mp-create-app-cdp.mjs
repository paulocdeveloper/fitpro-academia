/**
 * Cria app FitPro via CDP e extrai APP_USR produção.
 */
import { writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { chromium } from "playwright"

const LOCAL = resolve(".mercadopago.local.env")

async function extract(page) {
  const prod = page.getByText(/^produ[cç][aã]o$/i).first()
  if (await prod.isVisible({ timeout: 3000 }).catch(() => false)) await prod.click()
  await page.waitForTimeout(1500)
  const t = await page.evaluate(() => document.body?.innerText?.match(/APP_USR-[A-Za-z0-9-]+/)?.[0] ?? "")
  if (t) return t
  const copies = page.getByRole("button", { name: /copiar|copy/i })
  for (let i = 0; i < (await copies.count()); i++) {
    await copies.nth(i).click().catch(() => {})
    await page.waitForTimeout(500)
    const clip = await page
      .evaluate(() => navigator.clipboard?.readText?.() ?? "")
      .catch(() => "")
    const m = clip?.match(/APP_USR-[A-Za-z0-9-]+/)
    if (m) return m[0]
  }
  return ""
}

async function main() {
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9222", { timeout: 10000 })
  const page = browser.contexts()[0].pages().find((p) => p.url().includes("mercadopago")) ??
    browser.contexts()[0].pages()[0]

  await page.goto("https://www.mercadopago.com.br/developers/panel/app", {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  })
  await page.waitForTimeout(3000)
  console.log("1) Panel:", page.url())

  const criar =
    (await page.getByRole("button", { name: /criar aplicação/i }).isVisible().catch(() => false)
      ? page.getByRole("button", { name: /criar aplicação/i }).first()
      : null) ??
    page.getByRole("link", { name: /criar aplicação/i }).first()

  if (await criar.isVisible({ timeout: 8000 }).catch(() => false)) {
    await criar.click()
    await page.waitForTimeout(5000)
    console.log("2) Após criar click:", page.url())
  }

  if (page.url().includes("phone-validation") || page.url().includes("totp")) {
    console.error("✗ Validação de conta ainda ativa:", page.url().slice(0, 80))
    await browser.close().catch(() => {})
    process.exit(1)
  }

  const name = page.locator('input[type="text"], input:not([type="hidden"])').first()
  if (await name.isVisible({ timeout: 8000 }).catch(() => false)) {
    await name.fill("FitPro Academia")
    console.log("3) Nome preenchido")
  }

  for (const label of [/pagamento online|checkout|assinatura|subscription/i, /loja|e-commerce/i]) {
    const opt = page.getByText(label).first()
    if (await opt.isVisible({ timeout: 2000 }).catch(() => false)) {
      await opt.click().catch(() => {})
      await page.waitForTimeout(600)
    }
  }

  for (const btnLabel of [/continuar|próximo|next|criar|salvar|confirmar/i]) {
    const btn = page.getByRole("button", { name: btnLabel }).first()
    if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await btn.click().catch(() => {})
      await page.waitForTimeout(4000)
      console.log("4) Click:", btnLabel.source)
    }
  }

  await page.waitForTimeout(3000)
  console.log("5) URL:", page.url())

  const appLinks = await page.$$eval('a[href*="/developers/panel/app/"]', (as) =>
    as
      .map((a) => a.href)
      .filter((h) => !h.includes("create-app") && /\/app\/[a-f0-9-]+/.test(h)),
  )
  const unique = [...new Set(appLinks)]
  console.log("6) Apps:", unique.length)

  for (const appUrl of unique) {
    const cred =
      appUrl.replace(/\/?$/, "").split("/credentials")[0] + "/credentials/production"
    await page.goto(cred, { waitUntil: "domcontentloaded", timeout: 120000 })
    await page.waitForTimeout(4000)
    const t = await extract(page)
    if (t) {
      writeFileSync(LOCAL, `MERCADOPAGO_ACCESS_TOKEN=${t}\n`)
      console.log("✓", t.slice(0, 30) + "…")
      await browser.close().catch(() => {})
      return
    }
  }

  const body = await page.evaluate(() => document.body?.innerText?.slice(0, 500))
  console.error("body:", body?.replace(/\s+/g, " "))
  await browser.close().catch(() => {})
  process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
