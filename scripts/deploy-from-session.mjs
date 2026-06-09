/**
 * Deploy usando sessões locais (Git Credential Manager + .env).
 * Não altera banco — só push + Render env/deploy.
 */
import { execSync, spawnSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

const ROOT = process.cwd()
const API = "https://api.render.com/v1"
const SERVICE_NAME = "fitpro-academia"
const MYSQL_KEYS = [
  "DB_HOST", "DB_PORT", "DB_USER", "DB_PASSWORD", "DB_DATABASE",
  "MYSQL_URL", "MYSQL_HOST", "MYSQL_DATABASE", "MYSQL_PUBLIC_URL", "DB_DIALECT",
]

function gitCredentialToken() {
  const out = execSync("git credential-manager get", {
    input: "protocol=https\nhost=github.com\n\n",
    encoding: "utf8",
  })
  const m = out.match(/^password=(.+)$/m)
  if (!m) throw new Error("Token GitHub não encontrado no Credential Manager")
  return m[1].trim()
}

function loadEnv() {
  const p = resolve(ROOT, ".env")
  if (!existsSync(p)) throw new Error(".env ausente")
  const env = {}
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith("#")) continue
    const eq = t.indexOf("=")
    if (eq < 1) continue
    env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim()
  }
  return env
}

async function renderApi(path, options = {}) {
  const key = process.env.RENDER_API_KEY?.trim()
  if (!key) return null
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      ...options.headers,
    },
  })
  const text = await res.text()
  let body
  try { body = text ? JSON.parse(text) : null } catch { body = text }
  if (!res.ok) throw new Error(`Render ${res.status}: ${JSON.stringify(body)}`)
  return body
}

function gh(args, token) {
  const r = spawnSync("gh", args, {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env, GH_TOKEN: token, GIT_TERMINAL_PROMPT: "0" },
  })
  if (r.status !== 0) throw new Error(`gh ${args.join(" ")}: ${r.stderr || r.stdout}`)
  return (r.stdout || "").trim()
}

async function main() {
  const token = gitCredentialToken()
  const env = loadEnv()
  const repo = "paulocdeveloper/fitpro-academia"

  console.log("1) GitHub: conta", gh(["api", "user", "-q", ".login"], token))

  try {
    gh(["repo", "view", repo, "-q", ".name"], token)
    console.log("   Repo existe:", repo)
  } catch {
    console.log("   Criando repo:", repo)
    gh(["repo", "create", repo, "--private", "--source=.", "--remote=deploy-origin", "--push"], token)
  }

  const remotes = execSync("git remote", { cwd: ROOT, encoding: "utf8" })
  if (!remotes.includes("deploy-origin")) {
    execSync(`git remote add deploy-origin https://github.com/${repo}.git`, { cwd: ROOT })
  }
  execSync("git push deploy-origin main --force-with-lease", {
    cwd: ROOT,
    env: { ...process.env, GH_TOKEN: token, GIT_TERMINAL_PROMPT: "0" },
    stdio: "inherit",
  })
  console.log("   Push OK:", gh(["log", "-1", "--oneline"], token))

  const renderKey = process.env.RENDER_API_KEY
  if (!renderKey) {
    console.log("\n2) Render: RENDER_API_KEY não encontrada — configure env vars no painel e ligue o repo:", repo)
    return
  }

  console.log("\n2) Render: atualizando env + deploy…")
  let cursor = null
  let service = null
  do {
    const q = cursor ? `?limit=100&cursor=${cursor}` : "?limit=100"
    const data = await renderApi(`/services${q}`)
    for (const item of data) {
      const s = item.service ?? item
      if (s.name === SERVICE_NAME) { service = s; break }
    }
    cursor = service ? null : data[data.length - 1]?.cursor
  } while (cursor && !service)
  if (!service) throw new Error(`Serviço ${SERVICE_NAME} não encontrado`)

  const vars = await renderApi(`/services/${service.id}/env-vars?limit=100`)
  for (const k of MYSQL_KEYS) {
    if (vars.some((row) => (row.envVar ?? row).key === k)) {
      await renderApi(`/services/${service.id}/env-vars/${encodeURIComponent(k)}`, { method: "DELETE" })
      console.log("   removido:", k)
    }
  }
  for (const k of ["DATABASE_URL", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]) {
    await renderApi(`/services/${service.id}/env-vars/${encodeURIComponent(k)}`, {
      method: "PUT",
      body: JSON.stringify({ envVarValue: env[k] }),
    })
    console.log("   OK:", k)
  }
  const deploy = await renderApi(`/services/${service.id}/deploys`, {
    method: "POST",
    body: JSON.stringify({ clearCache: "clear" }),
  })
  console.log("   Deploy:", deploy.id ?? deploy.deploy?.id)
}

main().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
