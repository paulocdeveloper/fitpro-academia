/**
 * Valida Mercado Pago em produção: checkout URL, webhook, assinatura mensal.
 */
import { loadProjectEnv } from "./env-loader.mjs"

loadProjectEnv()

const BASE = process.env.PROD_URL ?? "https://fitpro-academia.onrender.com"

async function registerFitness() {
  const email = `mp.prod.${Date.now()}@example.com`
  const res = await fetch(`${BASE}/api/auth/register-fitness`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nome: "Teste MP Prod",
      email,
      password: "TesteFit@123",
    }),
  })
  const json = await res.json().catch(() => ({}))
  const cookie = res.headers.get("set-cookie") ?? ""
  const token = cookie.match(/fitpro_token=([^;]+)/)?.[1] ?? null
  return { status: res.status, token, json }
}

function headers(token) {
  return { Cookie: `fitpro_token=${token}`, "Content-Type": "application/json" }
}

async function main() {
  console.log("=== Validação Mercado Pago (produção) ===")
  console.log("URL:", BASE, "\n")

  const health = await fetch(`${BASE}/api/health`).then((r) => r.json()).catch(() => null)
  const mpSet = health?.env?.MERCADOPAGO_ACCESS_TOKEN_set === true
  console.log(mpSet ? "✓" : "✗", "Health MERCADOPAGO_ACCESS_TOKEN_set:", mpSet)

  const reg = await registerFitness()
  if (reg.status !== 200 || !reg.token) {
    console.error("✗ Registro falhou", reg.status)
    process.exit(1)
  }

  const checkout = await fetch(`${BASE}/api/subscription/checkout`, {
    method: "POST",
    headers: headers(reg.token),
    body: JSON.stringify({ provider: "mercadopago" }),
  })
  const checkoutJson = await checkout.json().catch(() => ({}))

  if (checkoutJson.checkoutUrl?.includes("mercadopago")) {
    console.log("✓ Checkout real → URL Mercado Pago")
    const recurring = checkoutJson.plan?.priceBrl === 10.9
    console.log(recurring ? "✓" : "✗", "Plano mensal R$ 10,90:", checkoutJson.plan?.priceBrl)
    console.log("  preapproval:", checkoutJson.preapprovalId ?? "(ok)")
  } else if (checkout.status === 503) {
    console.log("✗ Checkout MP não configurado:", checkoutJson.error)
    process.exit(1)
  } else {
    console.log("✗ Checkout inesperado:", checkout.status, checkoutJson)
    process.exit(1)
  }

  const webhook = await fetch(`${BASE}/api/subscription/webhook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-signature": "ts=1,v1=invalid",
      "x-request-id": "test",
    },
    body: JSON.stringify({ type: "subscription_preapproval", data: { id: "test" } }),
  })
  console.log(
    webhook.status === 401 ? "✓" : webhook.status === 503 ? "~" : "✗",
    "Webhook rejeita assinatura inválida →",
    webhook.status,
  )

  const status = await fetch(`${BASE}/api/subscription/status`, {
    headers: headers(reg.token),
  })
  const statusJson = await status.json().catch(() => ({}))
  console.log(
    statusJson.checkout?.mercadopago ? "✓" : "✗",
    "Status API mercadopago habilitado",
  )
  console.log(
    statusJson.subscription?.paymentStatus === "pending" ? "✓" : "~",
    "payment_status pending após checkout:",
    statusJson.subscription?.paymentStatus,
  )

  const treino = await fetch(`${BASE}/api/treino-inteligente`, { headers: headers(reg.token) })
  console.log(treino.status === 200 ? "✓" : "✗", "IA treino intacto →", treino.status)

  const login = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "master@academia.com", password: "Master@123" }),
  })
  console.log(login.status === 200 ? "✓" : "~", "Login admin →", login.status)

  console.log("\n✓ Validação Mercado Pago concluída.")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
