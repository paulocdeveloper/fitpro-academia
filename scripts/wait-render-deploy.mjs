/**
 * Aguarda deploy Render do serviço fitpro-academia.
 */
import { loadProjectEnv } from "./env-loader.mjs"

loadProjectEnv()

const API = "https://api.render.com/v1"
const SERVICE_ID = "srv-d85h823rjlhs73e0pa80"
const key = process.env.RENDER_API_KEY?.trim()
if (!key) {
  console.error("RENDER_API_KEY ausente")
  process.exit(1)
}

async function api(path) {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
  })
  const text = await res.text()
  let body
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = text
  }
  if (!res.ok) throw new Error(`${res.status} ${JSON.stringify(body)}`)
  return body
}

async function main() {
  const trigger = await fetch(`${API}/services/${SERVICE_ID}/deploys`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ clearCache: "clear" }),
  })
  const triggerBody = await trigger.json().catch(() => ({}))
  const deployId = triggerBody?.id ?? triggerBody?.deploy?.id
  console.log("Deploy disparado:", deployId ?? "(auto via git)")

  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 15000))
    const list = await api(`/services/${SERVICE_ID}/deploys?limit=1`)
    const d = list[0]?.deploy
    if (!d) continue
    console.log(`[${i + 1}] status=${d.status} commit=${d.commit?.id?.slice(0, 7)}`)
    if (d.status === "live") {
      console.log("✓ Deploy live")
      process.exit(0)
    }
    if (d.status === "build_failed" || d.status === "update_failed" || d.status === "canceled") {
      console.error("✗ Deploy falhou:", d.status)
      process.exit(1)
    }
  }
  console.log("~ Timeout aguardando deploy — verifique o painel Render")
  process.exit(2)
}

main().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
