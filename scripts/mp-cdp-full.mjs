/**
 * Usa Chrome CDP (9222) com aba Mercado Pago autenticada:
 * aguarda validação → cria app se faltar → credenciais produção → APP_USR
 */
import { writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { chromium } from "playwright"

const LOCAL = resolve(".mercadopago.local.env")
const CDP_PORTS = [9222, 9223, 9224, 9225]

async function connectCdp() {
  for (const port of CDP_PORTS) {
    try {
      const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`, { timeout: 8000 })
      console.log(`✓ CDP porta ${port}`)
      return browser
    } catch {
      /* */
    }
  }
  throw new Error("Chrome CDP indisponível (portas 9222–9225)")
}

async function tokensFromPage(page) {
  try {
    return await page.evaluate(() => {
      const m = document.body?.innerText?.match(/APP_USR-[A-Za-z0-9-]+/g)
      if (m?.[0]) return m[0]
      for (const el of document.querySelectorAll("input, code, pre, span")) {
        const v = ((el).value ?? el.textContent ?? "").trim()
        const hit = v.match(/APP_USR-[A-Za-z0-9-]+/)
        if (hit) return hit[0]
      }
      return ""
    })
  } catch {
    return ""
  }
}

async function readClipboard(page) {
  return page.evaluate(async () => {
    try {
      return await navigator.clipboard.readText()
    } catch {
      return ""
    }
  })
}

async function clickCopyButtons(page) {
  const copies = page.getByRole("button", { name: /copiar|copy/i })
  const n = await copies.count()
  for (let i = 0; i < n; i++) {
    await copies.nth(i).click({ timeout: 3000 }).catch(() => {})
    await page.waitForTimeout(600)
    const clip = await readClipboard(page)
    const m = clip?.match(/APP_USR-[A-Za-z0-9-]+/)
    if (m) return m[0]
  }
  return ""
}

async function selectProducao(page) {
  const prod = page.getByText(/^produ[cç][aã]o$/i).first()
  if (await prod.isVisible({ timeout: 4000 }).catch(() => false)) {
    await prod.click()
    await page.waitForTimeout(1500)
  }
}

async function extractToken(page) {
  await selectProducao(page)
  let t = await tokensFromPage(page)
  if (t) return t
  t = await clickCopyButtons(page)
  if (t) return t
  return ""
}

function pickMpPage(ctx) {
  const pages = ctx.pages()
  const score = (url) => {
    if (/credentials/i.test(url)) return 100
    if (/\/app\/[a-f0-9-]+/i.test(url)) return 80
    if (url.includes("developers/panel")) return 60
    if (url.includes("mercadopago") || url.includes("mercadolivre")) return 40
    return 0
  }
  return [...pages].sort((a, b) => score(b.url()) - score(a.url()))[0] ?? null
}

async function tryBypassChallenge(page) {
  const smsBtn = page.locator('button[aria-labelledby="channel-sms-content"]').first()
  if (await smsBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await smsBtn.click().catch(() => {})
    await page.waitForTimeout(3000)
    return
  }
  const alt = page.getByRole("button", { name: /verificar de outra forma/i }).first()
  if (await alt.isVisible({ timeout: 2000 }).catch(() => false)) {
    await alt.click().catch(() => {})
    await page.waitForTimeout(3000)
  }
  const outro = page.getByRole("button", { name: /usar outro método|outro método/i }).first()
  if (await outro.isVisible({ timeout: 2000 }).catch(() => false)) {
    await outro.click().catch(() => {})
    await page.waitForTimeout(2000)
  }
}

async function waitOutOfChallenge(page, maxMs = 600000) {
  const end = Date.now() + maxMs
  let lastLog = 0
  while (Date.now() < end) {
    const url = page.url()
    if (
      url.includes("phone-validation") ||
      url.includes("method-selector") ||
      url.includes("totp-in-app") ||
      url.includes("challenges")
    ) {
      await tryBypassChallenge(page)
    }
    if (
      !url.includes("phone-validation") &&
      !url.includes("method-selector") &&
      !url.includes("challenges") &&
      !url.includes("totp-in-app") &&
      !url.includes("auth.mercadolibre") &&
      !url.includes("login")
    ) {
      return true
    }
    if (Date.now() - lastLog > 20000) {
      console.log("  aguardando confirmação no app Mercado Pago…", url.slice(0, 75))
      lastLog = Date.now()
    }
    await page.waitForTimeout(2500)
  }
  return false
}

async function createApplication(page) {
  console.log("Criando aplicação FitPro…")
  await page.goto("https://www.mercadopago.com.br/developers/panel/app/create-app", {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  })
  await page.waitForTimeout(3000)

  const nameInput = page
    .locator('input[name*="name" i], input[placeholder*="nome" i], input[type="text"]')
    .first()
  if (await nameInput.isVisible({ timeout: 8000 }).catch(() => false)) {
    await nameInput.fill("FitPro Academia")
  }

  const integracao = page.getByText(/assinatura|subscription|pagamento|checkout|online payments/i).first()
  if (await integracao.isVisible({ timeout: 5000 }).catch(() => false)) {
    await integracao.click().catch(() => {})
    await page.waitForTimeout(800)
  }

  const criar = page.getByRole("button", { name: /criar|create|continuar|salvar/i }).first()
  if (await criar.isVisible({ timeout: 8000 }).catch(() => false)) {
    await criar.click()
    await page.waitForTimeout(5000)
  }

  const href = await page
    .locator('a[href*="/developers/panel/app/"]')
    .first()
    .getAttribute("href")
    .catch(() => null)
  if (href && /\/app\/[a-f0-9-]+/.test(href)) {
    const cred = href.replace(/\/?$/, "").split("/credentials")[0] + "/credentials/production"
    const url = cred.startsWith("http") ? cred : `https://www.mercadopago.com.br${cred}`
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 })
    await page.waitForTimeout(4000)
    return extractToken(page)
  }
  return ""
}

async function openProductionCredentials(page) {
  await page.goto("https://www.mercadopago.com.br/developers/panel/app", {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  })
  await page.waitForTimeout(4000)

  const links = await page.$$eval('a[href*="/developers/panel/app/"]', (as) =>
    as
      .map((a) => a.href)
      .filter((h) => !h.includes("create-app") && /\/app\/[a-f0-9-]+/.test(h)),
  )
  const unique = [...new Set(links)]
  console.log("Apps:", unique.length)

  for (const appUrl of unique) {
    const credUrl =
      appUrl.replace(/\/?$/, "").split("/credentials")[0] + "/credentials/production"
    console.log("Credenciais:", credUrl)
    await page.goto(credUrl, { waitUntil: "domcontentloaded", timeout: 120000 })
    await page.waitForTimeout(3500)
    const t = await extractToken(page)
    if (t) return t
  }

  const criarLink = page.getByRole("link", { name: /criar aplicação/i }).first()
  const criarBtn = page.getByRole("button", { name: /criar aplicação/i }).first()
  if (
    (await criarLink.isVisible({ timeout: 3000 }).catch(() => false)) ||
    (await criarBtn.isVisible({ timeout: 3000 }).catch(() => false))
  ) {
    return createApplication(page)
  }

  const credLink = page.getByRole("link", { name: /credenciais/i }).first()
  if (await credLink.isVisible({ timeout: 5000 }).catch(() => false)) {
    await credLink.click()
    await page.waitForTimeout(3000)
    return extractToken(page)
  }

  return ""
}

async function main() {
  console.log("=== MP CDP: aba autenticada → APP_USR ===\n")
  const browser = await connectCdp()
  const ctx = browser.contexts()[0]
  let page = pickMpPage(ctx) ?? (await ctx.newPage())

  await page.bringToFront().catch(() => {})
  console.log("Aba:", page.url().slice(0, 90))

  if (!(await waitOutOfChallenge(page))) {
    console.error("✗ Validação de conta MP ainda pendente na aba do Chrome.")
    await browser.close().catch(() => {})
    process.exit(1)
  }

  let token = ""
  if (page.url().includes("credentials")) {
    token = await extractToken(page)
  }
  if (!token) token = await openProductionCredentials(page)
  if (!token) {
    await page.goto("https://www.mercadopago.com.br/developers/panel/app", {
      waitUntil: "domcontentloaded",
      timeout: 120000,
    })
    token = await tokensFromPage(page)
  }

  if (!token?.startsWith("APP_USR-")) {
    console.error("✗ APP_USR- não encontrado. URL:", page.url())
    const snippet = await page
      .evaluate(() => document.body?.innerText?.slice(0, 400))
      .catch(() => "")
    console.error("Página:", snippet?.replace(/\s+/g, " "))
    await browser.close().catch(() => {})
    process.exit(1)
  }

  writeFileSync(LOCAL, `MERCADOPAGO_ACCESS_TOKEN=${token}\n`, "utf8")
  console.log("✓ Token salvo:", token.slice(0, 28) + "…")
  await browser.close().catch(() => {})
}

main().catch((e) => {
  console.error("✗", e.message)
  process.exit(1)
})
