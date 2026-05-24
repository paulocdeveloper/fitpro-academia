/**
 * Valida deploy em produção (Render).
 * Uso: node scripts/validate-production.mjs
 */
const BASE = process.env.PROD_URL ?? "https://fitpro-academia.onrender.com"

async function get(path) {
  const res = await fetch(`${BASE}${path}`)
  const text = await res.text()
  let json = null
  try {
    json = JSON.parse(text)
  } catch {
    /* HTML 404 etc. */
  }
  return { status: res.status, json, text: text.slice(0, 200) }
}

async function postLogin() {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "master@academia.com", password: "Master@123" }),
  })
  const json = await res.json().catch(() => ({}))
  return { status: res.status, json }
}

console.log("=== Validação produção ===")
console.log("URL:", BASE, "\n")

const health = await get("/api/health")
console.log("GET /api/health →", health.status)
if (health.json) {
  console.log(JSON.stringify(health.json, null, 2))
  if (health.json.dialect === "postgres" && health.json.ok) {
    console.log("\n✓ Supabase PostgreSQL ativo em produção")
  }
} else {
  console.log("(não é JSON — deploy antigo sem rota /api/health)")
  console.log(health.text)
}

const login = await postLogin()
console.log("\nPOST /api/auth/login →", login.status)
console.log(JSON.stringify(login.json, null, 2))

const oldMsg = "DB_DATABASE"
if (JSON.stringify(login.json).includes(oldMsg)) {
  console.log("\n✗ Ainda usa código/env MySQL antigo — faça push + Clear cache deploy no Render")
  process.exit(1)
}
if (login.status === 200 && login.json?.ok) {
  console.log("\n✓ Login OK em produção")
  process.exit(0)
}
if (health.json?.ok && health.json?.dialect === "postgres") {
  console.log("\n~ Health OK; ajuste login/schema se necessário (npm run db:bootstrap com DATABASE_URL de prod)")
  process.exit(0)
}
process.exit(1)
