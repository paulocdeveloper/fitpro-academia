import { writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { chromium } from "playwright"

const LOCAL = resolve(".mercadopago.local.env")
const PROFILE = resolve(".render-browser-profile")

async function main() {
  const ctx = await chromium.launchPersistentContext(PROFILE, {
    headless: false,
    viewport: { width: 1440, height: 900 },
  })
  const page = ctx.pages()[0] ?? (await ctx.newPage())
  await page.goto("https://www.mercadopago.com.br/developers/panel/app", {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  })
  await page.waitForTimeout(5000)
  console.log("URL:", page.url())

  const links = await page.$$eval('a[href*="/developers/panel/app/"]', (as) =>
    as
      .map((a) => a.href)
      .filter((h) => !h.includes("create-app") && /\/app\/[a-f0-9-]+/.test(h)),
  )
  const unique = [...new Set(links)]
  console.log("Apps:", unique.length)

  for (const appUrl of unique) {
    const cred =
      appUrl.replace(/\/?$/, "").split("/credentials")[0] + "/credentials/production"
    await page.goto(cred, { waitUntil: "domcontentloaded", timeout: 120000 })
    await page.waitForTimeout(4000)
    const prod = page.getByText(/^produ[cç][aã]o$/i).first()
    if (await prod.isVisible({ timeout: 3000 }).catch(() => false)) await prod.click()
    const t = await page.evaluate(() => {
      const m = document.body?.innerText?.match(/APP_USR-[A-Za-z0-9-]+/)
      return m?.[0] ?? ""
    })
    if (t) {
      writeFileSync(LOCAL, `MERCADOPAGO_ACCESS_TOKEN=${t}\n`)
      console.log("✓", t.slice(0, 28) + "…")
      await ctx.close()
      return
    }
  }

  await ctx.close()
  process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
