/**
 * Valida API IA Treino em produção (perfil + recálculo).
 * Uso: npm run validate:treino-inteligente
 */
import { loadProjectEnv } from "./env-loader.mjs"

loadProjectEnv()

const BASE = process.env.PROD_URL ?? "https://fitpro-academia.onrender.com"

async function registerFitness() {
  const email = `treino.ia.${Date.now()}@example.com`
  const res = await fetch(`${BASE}/api/auth/register-fitness`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nome: "Teste IA Treino",
      email,
      password: "TesteFit@123",
    }),
  })
  const text = await res.text()
  let json = {}
  try {
    json = JSON.parse(text)
  } catch {
    console.error("✗ Registro: resposta não-JSON", res.status, text.slice(0, 120))
    process.exit(1)
  }
  const cookie = res.headers.get("set-cookie") ?? ""
  const tokenMatch = cookie.match(/fitpro_token=([^;]+)/)
  return { status: res.status, json, token: tokenMatch?.[1] ?? null }
}

function headers(token) {
  return { Cookie: `fitpro_token=${token}`, "Content-Type": "application/json" }
}

async function parseJson(res) {
  const text = await res.text()
  if (!text.trim()) return { status: res.status, json: {}, text: "" }
  try {
    return { status: res.status, json: JSON.parse(text), text }
  } catch {
    return { status: res.status, json: null, text }
  }
}

async function main() {
  console.log("=== Validação IA Treino (perfil) ===")
  console.log("URL:", BASE, "\n")

  const reg = await registerFitness()
  if (reg.status !== 200 || !reg.token) {
    console.error("✗ Registro fitness falhou", reg.status, reg.json)
    process.exit(1)
  }
  console.log("✓ Registro usuario OK")

  const getRes = await fetch(`${BASE}/api/treino-inteligente`, { headers: headers(reg.token) })
  const getParsed = await parseJson(getRes)
  console.log(getRes.status === 200 && getParsed.json?.perfil ? "✓" : "✗", "GET perfil →", getRes.status)

  const perfilPayload = {
    peso_kg: "67",
    altura_cm: "168",
    idade: "23",
    frequencia_semanal: "4",
    sexo: "outro",
    nivel: "iniciante",
    objetivo: "Hipertrofia",
    limitacoes: null,
    percentual_gordura: null,
  }

  const putRes = await fetch(`${BASE}/api/treino-inteligente`, {
    method: "PUT",
    headers: headers(reg.token),
    body: JSON.stringify(perfilPayload),
  })
  const putParsed = await parseJson(putRes)
  const putOk = putRes.status === 200 && putParsed.json?.treino?.dias?.length > 0
  console.log(putOk ? "✓" : "✗", "PUT perfil (strings) + treino →", putRes.status, putParsed.json?.error ?? "")

  const badGordura = await fetch(`${BASE}/api/treino-inteligente`, {
    method: "PUT",
    headers: headers(reg.token),
    body: JSON.stringify({ ...perfilPayload, percentual_gordura: "67" }),
  })
  const badParsed = await parseJson(badGordura)
  const badOk = badGordura.status === 400 && /gordura/i.test(badParsed.json?.error ?? "")
  console.log(badOk ? "✓" : "✗", "PUT gordura 67 rejeitado →", badGordura.status, badParsed.json?.error ?? "")

  const postRes = await fetch(`${BASE}/api/treino-inteligente`, {
    method: "POST",
    headers: headers(reg.token),
  })
  const postParsed = await parseJson(postRes)
  console.log(
    postRes.status === 200 && postParsed.json?.treino ? "✓" : "✗",
    "POST recalcular →",
    postRes.status,
  )

  if (!putOk) {
    console.error("\nFalha no salvamento. Body:", putParsed.text?.slice(0, 200))
    process.exit(1)
  }
  console.log("\n✓ IA Treino validado em produção")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
