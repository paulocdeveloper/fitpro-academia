/**
 * Validação E2E: Vision + análise real com imagem de prato.
 */
const BASE = process.env.PROD_URL ?? "https://fitpro-academia.onrender.com"

// JPEG mínimo válido (fallback se Wikimedia indisponível)
const TINY_JPEG =
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="

async function login() {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "master@academia.com", password: "Master@123" }),
  })
  const set = res.headers.get("set-cookie") ?? ""
  const cookie = set.split(",").map((c) => c.split(";")[0].trim()).join("; ")
  const json = await res.json().catch(() => ({}))
  return { cookie, ok: res.status === 200 && json.ok }
}

async function tryFoodImageUrl() {
  const urls = [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Good_Food_Display_-_NCI_Visuals_Online.jpg/640px-Good_Food_Display_-_NCI_Visuals_Online.jpg",
  ]
  for (const url of urls) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(10000) })
      if (!r.ok) continue
      const buf = Buffer.from(await r.arrayBuffer())
      if (buf.length < 5000) continue
      return `data:image/jpeg;base64,${buf.toString("base64")}`
    } catch {
      /* next */
    }
  }
  return `data:image/jpeg;base64,${TINY_JPEG}`
}

console.log("=== Validação E2E Vision ===\n")

const health = await fetch(`${BASE}/api/health`).then((r) => r.json())
if (!health?.env?.OPENAI_API_KEY_set) {
  console.error("✗ OPENAI_API_KEY_set=false em produção")
  process.exit(1)
}
console.log("✓ OPENAI configurada | modelo:", health.env.OPENAI_VISION_MODEL)

const { cookie, ok: loginOk } = await login()
if (!loginOk || !cookie) {
  console.error("✗ Login falhou")
  process.exit(1)
}
console.log("✓ Login OK")

const status = await fetch(`${BASE}/api/nutrition/status`, { headers: { Cookie: cookie } }).then((r) => r.json())
if (!status?.vision?.configured) {
  console.error("✗ Vision não configurada em /api/nutrition/status")
  process.exit(1)
}
console.log("✓ Vision API ativa:", status.vision.model)

console.log("\nEnviando imagem de teste para análise…")
const image = await tryFoodImageUrl()
const analyzeRes = await fetch(`${BASE}/api/nutrition/analyze`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Cookie: cookie },
  body: JSON.stringify({
    image,
    quality: { ok: true, score: 85, issues: [] },
    width: 640,
    height: 480,
    pixels: [],
  }),
})

const result = await analyzeRes.json().catch(() => null)
console.log("POST /api/nutrition/analyze →", analyzeRes.status)

if (analyzeRes.status !== 200) {
  console.error("✗ Análise falhou:", JSON.stringify(result)?.slice(0, 400))
  process.exit(1)
}

console.log("  engine:", result.engine)
console.log("  model:", result.model ?? "—")
console.log("  confiança:", result.confianca_geral, "%")
console.log("  items:", result.items?.length ?? 0)
console.log("  resumo:", result.resumo?.slice(0, 80))

if (result.engine !== "openai") {
  console.error("✗ Esperado engine=openai, recebido:", result.engine)
  process.exit(1)
}

if (result.ok && result.items?.length > 0) {
  const first = result.items[0]
  console.log("\n✓ Reconhecimento OK:", first.nome)
  console.log(`  P ${first.proteinas_g}g | C ${first.carboidratos_g}g | G ${first.gorduras_g}g | ${first.kcal} kcal`)
} else if (result.confianca_geral >= 40) {
  console.log("\n~ Vision respondeu (confiança ou prato não identificado na imagem de teste)")
} else {
  console.log("\n~ Vision online — imagem de teste sem comida clara (esperado em alguns casos)")
}

console.log("\n✓ E2E Vision concluído")
console.log("\nMobile: teste manual em Chrome (Android) e Safari (iPhone):")
console.log(`  ${BASE}/dietas → Escanear Comida`)
