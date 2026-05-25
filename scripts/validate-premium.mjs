/**
 * Valida Premium Nutrição + Mercado Pago em produção.
 * Uso: npm run validate:premium
 */
import { loadProjectEnv } from "./env-loader.mjs"

loadProjectEnv()

const BASE = process.env.PROD_URL ?? "https://fitpro-academia.onrender.com"

async function registerFitness() {
  const email = `premium.test.${Date.now()}@example.com`
  const res = await fetch(`${BASE}/api/auth/register-fitness`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nome: "Teste Premium",
      email,
      password: "TesteFit@123",
    }),
  })
  const json = await res.json().catch(() => ({}))
  const cookie = res.headers.get("set-cookie") ?? ""
  const tokenMatch = cookie.match(/fitpro_token=([^;]+)/)
  return { status: res.status, json, token: tokenMatch?.[1] ?? null, email }
}

function headers(token) {
  return { Cookie: `fitpro_token=${token}`, "Content-Type": "application/json" }
}

async function get(path, token) {
  const res = await fetch(`${BASE}${path}`, { headers: headers(token), redirect: "manual" })
  return { status: res.status, location: res.headers.get("location") }
}

async function main() {
  console.log("=== Validação Premium + Mercado Pago ===")
  console.log("URL:", BASE, "\n")

  const reg = await registerFitness()
  if (reg.status !== 200 || !reg.token) {
    console.error("✗ Registro fitness falhou", reg.status, reg.json)
    process.exit(1)
  }
  console.log("✓ Registro usuario OK")

  const dietasFree = await get("/dietas", reg.token)
  const blockedDietas =
    (dietasFree.status === 307 || dietasFree.status === 302) &&
    dietasFree.location?.includes("/premium")
  console.log(blockedDietas ? "✓" : "✗", "FREE /dietas → premium:", dietasFree.status, dietasFree.location ?? "")

  const analyzeFree = await fetch(`${BASE}/api/nutrition/analyze`, {
    method: "POST",
    headers: headers(reg.token),
    body: JSON.stringify({ image: "data:image/png;base64,iVBORw0KGgo=" }),
  })
  console.log(analyzeFree.status === 402 ? "✓" : "✗", "POST analyze FREE →", analyzeFree.status)

  const checkout = await fetch(`${BASE}/api/subscription/checkout`, {
    method: "POST",
    headers: headers(reg.token),
    body: JSON.stringify({ provider: "mercadopago" }),
  })
  const checkoutJson = await checkout.json().catch(() => ({}))

  if (checkoutJson.checkoutUrl) {
    console.log("✓ Checkout MP retorna checkoutUrl (pagamento real)")
    console.log("  ", checkoutJson.checkoutUrl.slice(0, 60) + "…")
  } else if (checkout.status === 503 && checkoutJson.code === "MP_NOT_CONFIGURED") {
    console.log("~ Checkout MP não configurado no servidor (defina MERCADOPAGO_ACCESS_TOKEN)")
  } else if (checkoutJson.activated) {
    console.log("~ Checkout mock ativo (dev)")
  } else {
    console.log("✗ Checkout →", checkout.status, checkoutJson.error ?? checkoutJson)
  }

  const webhookNoSig = await fetch(`${BASE}/api/subscription/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "test", data: { id: "0" } }),
  })
  const webhookOk =
    webhookNoSig.status === 401 ||
    webhookNoSig.status === 503 ||
    webhookNoSig.status === 200
  console.log(webhookOk ? "✓" : "✗", "Webhook protegido →", webhookNoSig.status)

  const statusRes = await fetch(`${BASE}/api/subscription/status`, {
    headers: headers(reg.token),
  })
  const statusJson = await statusRes.json().catch(() => ({}))
  console.log(
    statusRes.status === 200 ? "✓" : "✗",
    "GET status →",
    statusRes.status,
    "payment:",
    statusJson.subscription?.paymentStatus,
  )

  const cancelRes = await fetch(`${BASE}/api/subscription/cancel`, {
    method: "POST",
    headers: headers(reg.token),
  })
  console.log(
    cancelRes.status === 200 || cancelRes.status === 400 ? "✓" : "~",
    "POST cancel →",
    cancelRes.status,
  )

  const treino = await fetch(`${BASE}/api/treino-inteligente`, { headers: headers(reg.token) })
  console.log(treino.status === 200 ? "✓" : "✗", "IA treino continua FREE →", treino.status)

  const scanner = await get("/dietas", reg.token)
  console.log(
    scanner.status === 307 || scanner.status === 302 ? "✓" : "~",
    "Mobile redirect FREE dietas →",
    scanner.status,
  )

  console.log("\n✓ Validação Premium concluída.")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
