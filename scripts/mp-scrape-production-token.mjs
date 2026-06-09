/**
 * Extrai APP_USR- usando cópia do perfil Chrome do usuário (sessão MP).
 */
import { existsSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, cpSync } from "node:fs"
import { resolve, join } from "node:path"
import { homedir } from "node:os"
import { execSync } from "node:child_process"
import { chromium } from "playwright"

const ROOT = process.cwd()
const CLONE_DIR = resolve(ROOT, ".chrome-user-clone")
const LOCAL_ENV = resolve(ROOT, ".mercadopago.local.env")

function chromeUserData() {
  const local = process.env.LOCALAPPDATA || resolve(homedir(), "AppData/Local")
  return resolve(local, "Google/Chrome/User Data")
}

function isChromeRunning() {
  try {
    const out = execSync('tasklist /FI "IMAGENAME eq chrome.exe"', { encoding: "utf8" })
    return out.toLowerCase().includes("chrome.exe")
  } catch {
    return false
  }
}

function cloneChromeProfile() {
  const src = chromeUserData()
  if (!existsSync(src)) throw new Error("Chrome User Data não encontrado")

  if (existsSync(CLONE_DIR)) {
    console.log("✓ Clone Chrome já existe")
    return CLONE_DIR
  }

  console.log("Clonando perfil Chrome (sessão MP)…")
  mkdirSync(CLONE_DIR, { recursive: true })

  for (const f of ["Local State", "First Run"]) {
    const s = join(src, f)
    if (existsSync(s)) copyFileSync(s, join(CLONE_DIR, f))
  }

  const defaultSrc = join(src, "Default")
  const defaultDst = join(CLONE_DIR, "Default")
  if (!existsSync(defaultSrc)) throw new Error("Perfil Default não encontrado")

  cpSync(defaultSrc, defaultDst, {
    recursive: true,
    filter: (srcPath) => {
      const p = srcPath.replace(/\\/g, "/")
      if (p.includes("/Cache/") || p.includes("/Code Cache/") || p.includes("/GPUCache/")) {
        return false
      }
      return true
    },
  })

  console.log("✓ Clone pronto:", CLONE_DIR)
  return CLONE_DIR
}

async function readTokenFromPage(page) {
  await page.waitForTimeout(2500)
  const prod = page.getByText(/^produ[cç][aã]o$/i).first()
  if (await prod.isVisible({ timeout: 5000 }).catch(() => false)) {
    await prod.click()
    await page.waitForTimeout(1200)
  }
  const t = await page.evaluate(() => {
    const m = document.body?.innerText?.match(/APP_USR-[A-Za-z0-9-]+/g)
    return m?.[0] ?? ""
  })
  if (t) return t
  const btns = page.getByRole("button", { name: /copiar|copy/i })
  for (let i = 0; i < (await btns.count()); i++) {
    try {
      await btns.nth(i).click({ timeout: 2000 })
      await page.waitForTimeout(500)
      const clip = await page.evaluate(() => navigator.clipboard?.readText?.() ?? "")
      const m = clip?.match(/APP_USR-[A-Za-z0-9-]+/)
      if (m) return m[0]
    } catch {
      /* */
    }
  }
  return ""
}

async function openCredentials(page) {
  await page.goto("https://www.mercadopago.com.br/developers/panel/app", {
    waitUntil: "domcontentloaded",
    timeout: 180000,
  })
  await page.waitForTimeout(5000)

  if (page.url().includes("auth.mercadolibre")) {
    console.log("Aguardando SSO (até 2 min)…")
    const end = Date.now() + 120000
    while (Date.now() < end && page.url().includes("auth.mercadolibre")) {
      await page.waitForTimeout(2000)
    }
  }

  const href = await page.locator('a[href*="/developers/panel/app/"]').first().getAttribute("href").catch(() => null)
  if (href) {
    const cred = href.replace(/\/?$/, "").split("/credentials")[0] + "/credentials"
    const url = cred.startsWith("http") ? cred : `https://www.mercadopago.com.br${cred}`
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 180000 })
    await page.waitForTimeout(3000)
    const t = await readTokenFromPage(page)
    if (t) return t
  }

  const link = page.getByRole("link", { name: /credenciais/i }).first()
  if (await link.isVisible({ timeout: 8000 }).catch(() => false)) {
    await link.click()
    await page.waitForTimeout(3000)
    return readTokenFromPage(page)
  }
  return ""
}

async function tryCdp() {
  for (let port = 9222; port <= 9260; port++) {
    try {
      const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`, { timeout: 2000 })
      for (const ctx of browser.contexts()) {
        for (const page of ctx.pages()) {
          if (/mercadopago|mercadolibre|developers/i.test(page.url())) {
            const t = await readTokenFromPage(page)
            if (t) {
              await browser.close().catch(() => {})
              return t
            }
          }
        }
      }
      await browser.close().catch(() => {})
    } catch {
      /* */
    }
  }
  return ""
}

async function main() {
  console.log("=== Mercado Pago: APP_USR produção ===\n")

  let token = await tryCdp()
  if (token) {
    console.log("✓ Token via navegador CDP")
  } else {
    if (isChromeRunning()) {
      console.error("✗ Feche o Google Chrome e rode novamente (clone do perfil).")
      process.exit(1)
    }
    const userData = cloneChromeProfile()
    const context = await chromium.launchPersistentContext(userData, {
      channel: "chrome",
      headless: false,
      args: ["--profile-directory=Default"],
      viewport: { width: 1440, height: 900 },
    })
    const page = context.pages()[0] ?? (await context.newPage())
    try {
      token = await openCredentials(page)
    } finally {
      await context.close().catch(() => {})
    }
  }

  if (!token?.startsWith("APP_USR-")) {
    console.error("✗ APP_USR- não encontrado no painel Credenciais de produção.")
    process.exit(1)
  }

  writeFileSync(LOCAL_ENV, `MERCADOPAGO_ACCESS_TOKEN=${token}\n`, "utf8")
  console.log("✓ Token salvo")
  console.log("✓", token.slice(0, 22) + "…")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
