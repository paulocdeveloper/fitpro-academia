/**
 * Valida Premium Nutrição em produção.
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
  console.log("=== Validação Premium Nutrição ===")
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

  const nutricaoFree = await get("/nutricao", reg.token)
  const blockedNutricao =
    (nutricaoFree.status === 307 || nutricaoFree.status === 302) &&
    nutricaoFree.location?.includes("/premium")
  console.log(blockedNutricao ? "✓" : "✗", "FREE /nutricao → premium:", nutricaoFree.status, nutricaoFree.location ?? "")

  const analyzeFree = await fetch(`${BASE}/api/nutrition/analyze`, {
    method: "POST",
    headers: headers(reg.token),
    body: JSON.stringify({ image: "data:image/png;base64,iVBORw0KGgo=" }),
  })
  console.log(
    analyzeFree.status === 402 ? "✓" : "✗",
    "POST analyze FREE →",
    analyzeFree.status,
  )

  const checkout = await fetch(`${BASE}/api/subscription/checkout`, {
    method: "POST",
    headers: headers(reg.token),
    body: JSON.stringify({ provider: "mock" }),
  })
  const checkoutJson = await checkout.json().catch(() => ({}))
  const checkoutCookie = checkout.headers.get("set-cookie") ?? ""
  const premiumToken = checkoutCookie.match(/fitpro_token=([^;]+)/)?.[1] ?? reg.token
  console.log(
    checkout.status === 200 && checkoutJson.activated ? "✓" : "✗",
    "Checkout mock →",
    checkout.status,
    checkoutJson.error ?? "",
  )

  const me = await fetch(`${BASE}/api/auth/me`, { headers: headers(premiumToken) })
  const meJson = await me.json().catch(() => ({}))
  console.log(
    meJson.user?.isPremium ? "✓" : "✗",
    "GET /api/auth/me isPremium →",
    meJson.user?.isPremium,
  )

  const dietasPremium = await get("/dietas", premiumToken)
  console.log(
    dietasPremium.status === 200 ? "✓" : "~",
    "PREMIUM /dietas →",
    dietasPremium.status,
  )

  const analyzePremium = await fetch(`${BASE}/api/nutrition/analyze`, {
    method: "POST",
    headers: headers(premiumToken),
    body: JSON.stringify({ image: "data:image/png;base64,iVBORw0KGgo=" }),
  })
  console.log(
    analyzePremium.status !== 402 ? "✓" : "✗",
    "POST analyze PREMIUM →",
    analyzePremium.status,
  )

  const treino = await fetch(`${BASE}/api/treino-inteligente`, { headers: headers(premiumToken) })
  console.log(treino.status === 200 ? "✓" : "~", "IA treino ainda FREE →", treino.status)

  console.log("\n✓ Validação Premium concluída.")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
