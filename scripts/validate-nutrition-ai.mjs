/**
 * Valida IA nutricional em produção (OpenAI Vision + rotas).
 */
const BASE = process.env.PROD_URL ?? "https://fitpro-academia.onrender.com"

async function get(path, cookie) {
  const res = await fetch(`${BASE}${path}`, {
    headers: cookie ? { Cookie: cookie } : {},
  })
  const text = await res.text()
  let json = null
  try {
    json = JSON.parse(text)
  } catch {
    /* html */
  }
  return { status: res.status, json, text: text.slice(0, 300) }
}

async function post(path, body, cookie) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  let json = null
  try {
    json = JSON.parse(text)
  } catch {
    /* html */
  }
  return { status: res.status, json, text: text.slice(0, 300) }
}

function extractCookie(res) {
  const set = res.headers.get("set-cookie")
  if (!set) return ""
  return set.split(",").map((c) => c.split(";")[0].trim()).join("; ")
}

console.log("=== Validação IA Nutricional ===")
console.log("URL:", BASE, "\n")

const health = await get("/api/health")
console.log("GET /api/health →", health.status)
if (health.json?.env?.OPENAI_API_KEY_set) {
  console.log("✓ OPENAI_API_KEY configurada em produção")
  console.log("  Modelo:", health.json.env.OPENAI_VISION_MODEL ?? "gpt-4o")
} else {
  console.log("✗ OPENAI_API_KEY NÃO configurada — rode: npm run render:openai")
}

const loginRes = await fetch(`${BASE}/api/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "master@academia.com", password: "Master@123" }),
})
const cookie = extractCookie(loginRes)
const loginJson = await loginRes.json().catch(() => ({}))
console.log("\nPOST /api/auth/login →", loginRes.status, loginJson.ok ? "OK" : "")

if (!cookie) {
  console.log("✗ Sem cookie de sessão — não foi possível testar rotas autenticadas")
  process.exit(1)
}

const status = await get("/api/nutrition/status", cookie)
console.log("\nGET /api/nutrition/status →", status.status)
console.log(JSON.stringify(status.json, null, 2))
if (status.json?.vision?.configured) {
  console.log("\n✓ Vision API ativa para staff autenticado")
} else {
  console.log("\n~ Vision não configurada (fallback visual)")
}

const analyzeNoImage = await post("/api/nutrition/analyze", {}, cookie)
console.log("\nPOST /api/nutrition/analyze (sem imagem) →", analyzeNoImage.status)
if (analyzeNoImage.status === 400) {
  console.log("✓ Rota protegida e validando payload")
} else {
  console.log(analyzeNoImage.text)
}

const analyzePublic = await post("/api/nutrition/analyze", {})
console.log("\nPOST /api/nutrition/analyze (sem auth) →", analyzePublic.status)
if (analyzePublic.status === 401 || analyzePublic.status === 403) {
  console.log("✓ Rota exige autenticação staff")
} else {
  console.log("⚠ Esperado 401/403, recebido", analyzePublic.status)
}

console.log("\n=== Preview ===")
console.log(`${BASE}/dietas → Escanear Comida`)

if (health.json?.env?.OPENAI_API_KEY_set && status.json?.vision?.configured) {
  console.log("\n✓ IA Nutricional pronta para reconhecimento REAL")
  process.exit(0)
}

console.log("\n~ Configure OPENAI_API_KEY no Render para reconhecimento real")
process.exit(health.json?.ok ? 0 : 1)
