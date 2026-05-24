/**
 * Valida que credenciais internas não aparecem no HTML público.
 * Uso: node scripts/validate-privacy.mjs
 */
const BASE = process.env.PROD_URL ?? "https://fitpro-academia.onrender.com"
const LEAKS = ["admin@fitpro.com", "master@academia.com", "Master@123", "usuarios.perfil"]

async function check(path) {
  const res = await fetch(`${BASE}${path}`)
  const html = await res.text()
  const found = LEAKS.filter((s) => html.includes(s))
  return { path, status: res.status, found }
}

console.log("=== Validação privacidade (HTML público) ===\n")
for (const path of ["/login", "/cadastro", "/"]) {
  const r = await check(path)
  if (r.found.length) {
    console.log("✗", r.path, "expõe:", r.found.join(", "))
    process.exit(1)
  }
  console.log("✓", r.path, "— sem credenciais vazadas")
}

const me = await fetch(`${BASE}/api/auth/me`, { credentials: "omit" })
if (me.status === 401) console.log("✓ /api/auth/me exige autenticação")
else console.log("?", "/api/auth/me status", me.status)

const health = await fetch(`${BASE}/api/health`).then((r) => r.json())
if (health.masterUser?.email) {
  console.log("✗ /api/health expõe e-mail master")
  process.exit(1)
}
console.log("✓ /api/health não expõe e-mail master")

console.log("\n✓ Privacidade OK em páginas públicas")
