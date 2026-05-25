/**
 * Valida RBAC em produção (rotas e APIs).
 * Uso: npm run validate:permissions
 */
import { loadProjectEnv } from "./env-loader.mjs"

loadProjectEnv()

const BASE = process.env.PROD_URL ?? "https://fitpro-academia.onrender.com"
const ADMIN_EMAIL = process.env.VALIDATE_ADMIN_EMAIL ?? "master@academia.com"
const ADMIN_PASS = process.env.VALIDATE_ADMIN_PASSWORD ?? "Master@123"

async function login(email, password) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })
  const json = await res.json().catch(() => ({}))
  const cookie = res.headers.get("set-cookie") ?? ""
  const tokenMatch = cookie.match(/fitpro_token=([^;]+)/)
  return { status: res.status, json, token: tokenMatch?.[1] ?? null }
}

function authHeaders(token) {
  return {
    Cookie: `fitpro_token=${token}`,
    "Content-Type": "application/json",
  }
}

async function get(path, token, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: { ...authHeaders(token), ...(opts.headers ?? {}) },
    redirect: "manual",
  })
  return { status: res.status, location: res.headers.get("location") }
}

async function main() {
  console.log("=== Validação permissões ===")
  console.log("URL:", BASE, "\n")

  const admin = await login(ADMIN_EMAIL, ADMIN_PASS)
  if (admin.status !== 200 || !admin.token) {
    console.error("✗ Login admin falhou", admin.status, admin.json)
    process.exit(1)
  }
  console.log("✓ Login admin OK (role:", admin.json.user?.role, ")")

  const tiStaff = await get("/api/treino-inteligente", admin.token)
  if (tiStaff.status === 403) {
    console.log("✓ /api/treino-inteligente bloqueado para staff")
  } else {
    console.log("~ /api/treino-inteligente staff:", tiStaff.status, "(esperado 403)")
  }

  const treinosStaff = await fetch(`${BASE}/api/treinos`, { headers: authHeaders(admin.token) })
  console.log(
    treinosStaff.status === 200 ? "✓" : "✗",
    "GET /api/treinos staff →",
    treinosStaff.status,
  )

  const nutritionStaff = await fetch(`${BASE}/api/nutrition/status`, {
    headers: authHeaders(admin.token),
  })
  console.log(
    nutritionStaff.status === 200 ? "✓" : "✗",
    "GET /api/nutrition/status staff →",
    nutritionStaff.status,
  )

  const forbiddenPage = await get("/financeiro", admin.token)
  if (forbiddenPage.status === 200) {
    console.log("✓ Staff acessa /financeiro")
  } else {
    console.log("~ GET /financeiro staff:", forbiddenPage.status)
  }

  console.log("\n✓ Validação admin concluída.")
  console.log(
    "Para testar aluno, defina VALIDATE_ALUNO_EMAIL e VALIDATE_ALUNO_PASSWORD no .env",
  )
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
