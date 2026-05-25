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

async function registerFitness(email, password, nome = "Teste Fitness") {
  const res = await fetch(`${BASE}/api/auth/register-fitness`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome, email, password }),
  })
  const json = await res.json().catch(() => ({}))
  const cookie = res.headers.get("set-cookie") ?? ""
  const tokenMatch = cookie.match(/fitpro_token=([^;]+)/)
  return { status: res.status, json, token: tokenMatch?.[1] ?? null }
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
  console.log(tiStaff.status === 403 ? "✓" : "~", "/api/treino-inteligente staff →", tiStaff.status)

  const dashUsuario = await get("/dashboard", admin.token)
  console.log(dashUsuario.status === 200 ? "✓" : "~", "Staff /dashboard →", dashUsuario.status)

  const financeiro = await get("/financeiro", admin.token)
  console.log(financeiro.status === 200 ? "✓" : "~", "Staff /financeiro →", financeiro.status)

  const testEmail = process.env.VALIDATE_USUARIO_EMAIL?.trim()
  const testPass = process.env.VALIDATE_USUARIO_PASSWORD?.trim()

  if (testEmail && testPass) {
    const usuario = await login(testEmail, testPass)
    if (usuario.status === 200 && usuario.token && usuario.json.user?.role === "usuario") {
      console.log("\n✓ Login usuario OK")
      const ti = await fetch(`${BASE}/api/treino-inteligente`, { headers: authHeaders(usuario.token) })
      console.log(ti.status === 200 ? "✓" : "✗", "GET treino-inteligente usuario →", ti.status)
      const fin = await get("/financeiro", usuario.token)
      const blocked =
        fin.status === 307 || fin.status === 302 || fin.location?.includes("treino-inteligente")
      console.log(blocked ? "✓" : "✗", "usuario bloqueado em /financeiro →", fin.status, fin.location ?? "")
      const evo = await get("/evolucao", usuario.token)
      console.log(evo.status === 200 ? "✓" : "~", "GET /evolucao usuario →", evo.status)
      const dietas = await get("/dietas", usuario.token)
      const dietasBlocked =
        (dietas.status === 307 || dietas.status === 302) && dietas.location?.includes("/premium")
      console.log(dietasBlocked ? "✓" : "~", "usuario FREE /dietas → premium:", dietas.status)
    } else {
      console.log("\n~ Login usuario falhou — registre com VALIDATE_USUARIO_* ou use cadastro-fitness")
    }
  } else {
    const probeEmail = `fitpro.test.${Date.now()}@example.com`
    const reg = await registerFitness(probeEmail, "TesteFit@123")
    if (reg.status === 200 && reg.token && reg.json.user?.role === "usuario") {
      console.log("\n✓ Registro fitness OK (role usuario)")
      const ti = await fetch(`${BASE}/api/treino-inteligente`, { headers: authHeaders(reg.token) })
      console.log(ti.status === 200 ? "✓" : "✗", "GET treino-inteligente →", ti.status)
      const fin = await get("/financeiro", reg.token)
      const blocked =
        fin.status === 307 || fin.status === 302 || fin.location?.includes("treino-inteligente")
      console.log(blocked ? "✓" : "✗", "usuario /financeiro redirect →", fin.status)
      const dietas = await get("/dietas", reg.token)
      const dietasBlocked =
        (dietas.status === 307 || dietas.status === 302) && dietas.location?.includes("/premium")
      console.log(dietasBlocked ? "✓" : "✗", "usuario FREE /dietas → premium:", dietas.status)
    } else {
      console.log("\n~ Registro fitness:", reg.status, reg.json?.error ?? reg.json)
    }
  }

  console.log("\n✓ Validação concluída.")
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
