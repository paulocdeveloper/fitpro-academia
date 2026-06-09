import { spawn } from "node:child_process"
import { existsSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { chromium } from "playwright"

const CLONE = resolve(".chrome-user-clone")
const LOCAL = resolve(".mercadopago.local.env")
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"

async function safeTokens(page) {
  try {
    return await page.evaluate(() =>
      (document.body?.innerText ?? "").match(/APP_USR-[A-Za-z0-9-]+/g),
    )
  } catch {
    return null
  }
}

function startChrome() {
  if (!existsSync(CHROME)) return
  try {
    spawn(
      CHROME,
      [
        "--remote-debugging-port=9222",
        `--user-data-dir=${CLONE}`,
        "--no-first-run",
        "https://www.mercadopago.com.br/developers/panel/app",
      ],
      { detached: true, stdio: "ignore" },
    ).unref()
  } catch {
    /* já rodando */
  }
}

async function openCredentials(page) {
  const href = await page
    .locator('a[href*="/developers/panel/app/"]')
    .first()
    .getAttribute("href")
    .catch(() => null)
  if (href) {
    const cred = href.replace(/\/?$/, "").split("/credentials")[0] + "/credentials"
    const full = cred.startsWith("http") ? cred : `https://www.mercadopago.com.br${cred}`
    await page.goto(full, { waitUntil: "domcontentloaded", timeout: 120000 }).catch(() => {})
    await page.waitForTimeout(4000)
    return
  }
  const link = page.getByRole("link", { name: /credenciais/i }).first()
  if (await link.isVisible({ timeout: 5000 }).catch(() => false)) {
    await link.click()
    await page.waitForTimeout(4000)
  }
}

async function main() {
  startChrome()
  await new Promise((r) => setTimeout(r, 5000))

  const browser = await chromium.connectOverCDP("http://127.0.0.1:9222", { timeout: 20000 })
  const ctx = browser.contexts()[0]
  let page = ctx.pages()[0] ?? (await ctx.newPage())

  console.log("Aguardando login MP + credenciais (até 8 min)…")

  for (let i = 0; i < 240; i++) {
    await page.waitForTimeout(2000)
    try {
      page = ctx.pages().find((p) => p.url().includes("mercadopago") || p.url().includes("developers")) ?? page
      const url = page.url()
      const tokens = await safeTokens(page)

      if (i % 20 === 0) {
        console.log(`${Math.floor((i * 2) / 60)}m${(i * 2) % 60}s`, url.slice(0, 85))
      }

      if (tokens?.length) {
        writeFileSync(LOCAL, `MERCADOPAGO_ACCESS_TOKEN=${tokens[0]}\n`)
        console.log("✓ Token:", tokens[0].slice(0, 26) + "…")
        await browser.close().catch(() => {})
        return
      }

      if (
        url.includes("developers/panel") &&
        !url.includes("login") &&
        !url.includes("challenges") &&
        !url.includes("totp")
      ) {
        await openCredentials(page)
        const t2 = await safeTokens(page)
        if (t2?.length) {
          writeFileSync(LOCAL, `MERCADOPAGO_ACCESS_TOKEN=${t2[0]}\n`)
          console.log("✓ Token:", t2[0].slice(0, 26) + "…")
          await browser.close().catch(() => {})
          return
        }
      }
    } catch {
      /* navegação */
    }
  }

  await browser.close().catch(() => {})
  throw new Error("Timeout — complete o login MP no Chrome CDP (porta 9222)")
}

main().catch((e) => {
  console.error("✗", e.message)
  process.exit(1)
})
