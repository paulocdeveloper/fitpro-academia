import { writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { chromium } from "playwright"

const LOCAL = resolve(".mercadopago.local.env")

async function main() {
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9222", { timeout: 10000 })
  const ctx = browser.contexts()[0]
  const cookies = await ctx.cookies()
  const header = cookies.map((c) => `${c.name}=${c.value}`).join("; ")

  const endpoints = [
    "https://www.mercadopago.com.br/developers/panel/api/applications",
    "https://api.mercadopago.com/users/me",
  ]

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        headers: { cookie: header, accept: "application/json" },
      })
      const text = await res.text()
      const m = text.match(/APP_USR-[A-Za-z0-9-]+/)
      console.log(url, res.status, m ? "FOUND" : "no token")
      if (m) {
        writeFileSync(LOCAL, `MERCADOPAGO_ACCESS_TOKEN=${m[0]}\n`)
        console.log("✓", m[0].slice(0, 26) + "…")
        await browser.close().catch(() => {})
        return
      }
    } catch (e) {
      console.log(url, e.message)
    }
  }

  await browser.close().catch(() => {})
  process.exit(1)
}

main()
