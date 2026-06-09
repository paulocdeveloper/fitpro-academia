import { writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { chromium } from "playwright"

const LOCAL = resolve(".mercadopago.local.env")

async function tokens(page) {
  try {
    return await page.evaluate(() => {
      const m = document.body?.innerText?.match(/APP_USR-[A-Za-z0-9-]+/g)
      return m ?? []
    })
  } catch {
    return []
  }
}

async function main() {
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9222", { timeout: 10000 })
  const ctx = browser.contexts()[0]
  let page = ctx.pages().find((p) => p.url().includes("mercadopago")) ?? (await ctx.newPage())

  await page.goto("https://www.mercadopago.com.br/developers/panel/app", {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  })
  await page.waitForTimeout(5000)

  const appLinks = await page.$$eval('a[href*="/developers/panel/app/"]', (as) =>
    as
      .map((a) => a.href)
      .filter((h) => !h.includes("create-app") && /\/app\/[a-f0-9-]+/.test(h)),
  )
  const unique = [...new Set(appLinks)]
  console.log("Apps encontrados:", unique.length)

  for (const appUrl of unique) {
    const credUrl = appUrl.replace(/\/?$/, "").split("/credentials")[0] + "/credentials"
    console.log("Abrindo:", credUrl)
    await page.goto(credUrl, { waitUntil: "domcontentloaded", timeout: 120000 })
    await page.waitForTimeout(3000)

    const prod = page.getByText(/^produ[cç][aã]o$/i).first()
    if (await prod.isVisible({ timeout: 3000 }).catch(() => false)) await prod.click()

    await page.waitForTimeout(2000)
    let found = await tokens(page)
    if (found.length) {
      writeFileSync(LOCAL, `MERCADOPAGO_ACCESS_TOKEN=${found[0]}\n`)
      console.log("✓", found[0].slice(0, 28) + "…")
      await browser.close().catch(() => {})
      return
    }

    const copies = page.getByRole("button", { name: /copiar|copy/i })
    for (let i = 0; i < (await copies.count()); i++) {
      await copies.nth(i).click().catch(() => {})
      await page.waitForTimeout(400)
      const clip = await page.evaluate(() => navigator.clipboard?.readText?.() ?? "").catch(() => "")
      const m = clip.match(/APP_USR-[A-Za-z0-9-]+/)
      if (m) {
        writeFileSync(LOCAL, `MERCADOPAGO_ACCESS_TOKEN=${m[0]}\n`)
        console.log("✓ clipboard", m[0].slice(0, 28) + "…")
        await browser.close().catch(() => {})
        return
      }
    }
  }

  console.log("URL final:", page.url())
  const body = await page.evaluate(() => document.body?.innerText?.slice(0, 500)).catch(() => "")
  console.log("body:", body?.replace(/\n/g, " "))
  await browser.close().catch(() => {})
  process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
