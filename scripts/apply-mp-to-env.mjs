/**
 * Grava MERCADOPAGO_* no .env local (sem alterar outras chaves).
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"

const ENV_PATH = resolve(process.cwd(), ".env")
const LOCAL_MP = resolve(process.cwd(), ".mercadopago.local.env")

function readToken() {
  if (existsSync(LOCAL_MP)) {
    for (const line of readFileSync(LOCAL_MP, "utf8").split(/\r?\n/)) {
      if (line.startsWith("MERCADOPAGO_ACCESS_TOKEN=")) {
        return line.slice("MERCADOPAGO_ACCESS_TOKEN=".length).trim()
      }
    }
  }
  return process.env.MERCADOPAGO_ACCESS_TOKEN?.trim() || ""
}

function readWebhook() {
  if (existsSync(LOCAL_MP)) {
    for (const line of readFileSync(LOCAL_MP, "utf8").split(/\r?\n/)) {
      if (line.startsWith("MERCADOPAGO_WEBHOOK_SECRET=")) {
        return line.slice("MERCADOPAGO_WEBHOOK_SECRET=".length).trim()
      }
    }
  }
  return process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim() || ""
}

function upsertEnv(key, value) {
  if (!existsSync(ENV_PATH)) throw new Error(".env não encontrado")
  const lines = readFileSync(ENV_PATH, "utf8").split(/\r?\n/)
  const prefix = `${key}=`
  let found = false
  const out = lines.map((line) => {
    if (line.startsWith(prefix)) {
      found = true
      return `${key}=${value}`
    }
    return line
  })
  if (!found) {
    if (out.length && out[out.length - 1] !== "") out.push("")
    out.push(`${key}=${value}`)
  }
  writeFileSync(ENV_PATH, out.join("\n").replace(/\n*$/, "\n"), "utf8")
}

const token = readToken()
if (!token.startsWith("APP_USR-")) {
  console.error("✗ Token APP_USR- ausente")
  process.exit(1)
}

upsertEnv("MERCADOPAGO_ACCESS_TOKEN", token)
console.log("✓ MERCADOPAGO_ACCESS_TOKEN → .env")

const webhook = readWebhook()
if (webhook) {
  upsertEnv("MERCADOPAGO_WEBHOOK_SECRET", webhook)
  console.log("✓ MERCADOPAGO_WEBHOOK_SECRET → .env")
}
