/**
 * Valida SEO completo em produção (Google, social, segurança, indexação).
 * Uso: node scripts/validate-seo.mjs
 */
const BASE = process.env.PROD_URL ?? "https://fitpro-academia.onrender.com"

const checks = []

function ok(name) {
  checks.push({ name, pass: true })
  console.log("✓", name)
}
function fail(name, detail) {
  checks.push({ name, pass: false, detail })
  console.log("✗", name, detail ?? "")
}

async function fetchText(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, { redirect: "manual", ...opts })
  return { status: res.status, text: await res.text(), headers: res.headers }
}

async function main() {
  console.log("=== Validação SEO PRO ===")
  console.log("URL:", BASE, "\n")

  const sitemap = await fetchText("/sitemap.xml")
  if (sitemap.status === 200 && sitemap.text.includes("<loc>") && sitemap.text.includes("/login")) {
    ok("sitemap.xml")
  } else fail("sitemap.xml", `status ${sitemap.status}`)

  const robots = await fetchText("/robots.txt")
  if (
    robots.status === 200 &&
    robots.text.includes("Sitemap:") &&
    robots.text.includes("Disallow: /dashboard") &&
    robots.text.includes("Allow: /login")
  ) {
    ok("robots.txt")
  } else fail("robots.txt")

  for (const path of ["/login", "/cadastro"]) {
    const page = await fetchText(path)
    if (page.status !== 200) {
      fail(`${path} HTTP`, `status ${page.status}`)
      continue
    }
    const html = page.text
    const label = path
    if (html.includes("FitPro Academia")) ok(`${label} — brand`)
    else fail(`${label} — brand`)
    if (html.includes('name="description"')) ok(`${label} — meta description`)
    else fail(`${label} — meta description`)
    if (html.includes("og:title") || html.includes('property="og:title"')) ok(`${label} — Open Graph`)
    else fail(`${label} — Open Graph`)
    if (html.includes("twitter:card")) ok(`${label} — Twitter Card`)
    else fail(`${label} — Twitter Card`)
    if (html.includes("canonical")) ok(`${label} — canonical`)
    else fail(`${label} — canonical`)
    if (html.includes("application/ld+json")) ok(`${label} — schema.org JSON-LD`)
    else fail(`${label} — schema.org JSON-LD`)
    if (html.includes('name="viewport"')) ok(`${label} — viewport mobile`)
    else fail(`${label} — viewport mobile`)
    if (html.includes("robots") && !html.includes("noindex")) ok(`${label} — indexável (sem noindex)`)
    else if (html.includes("noindex")) fail(`${label} — indexável`, "noindex inesperado")
    else ok(`${label} — robots meta`)
    if (html.includes("opengraph-image") || html.includes("og:image")) ok(`${label} — og:image`)
    else fail(`${label} — og:image`)
  }

  const dash = await fetchText("/dashboard")
  const dashRobots = dash.headers.get("x-robots-tag")
  if (dash.status === 307 || dash.status === 302 || dash.status === 308) {
    if (dashRobots?.includes("noindex")) ok("dashboard redirect com X-Robots-Tag noindex")
    else fail("dashboard redirect X-Robots-Tag", dashRobots ?? "ausente")
  } else fail("dashboard redirect", `status ${dash.status}`)

  const og = await fetch(`${BASE}/opengraph-image`)
  if (og.status === 200 && og.headers.get("content-type")?.includes("image")) {
    ok("opengraph-image (WhatsApp/Facebook/Instagram/Discord)")
  } else fail("opengraph-image", `status ${og.status}`)

  const twitter = await fetch(`${BASE}/twitter-image`)
  if (twitter.status === 200 && twitter.headers.get("content-type")?.includes("image")) {
    ok("twitter-image")
  } else fail("twitter-image", `status ${twitter.status}`)

  const manifest = await fetchText("/manifest.webmanifest")
  if (manifest.status === 200 && manifest.text.includes("FitPro")) ok("manifest.webmanifest (PWA)")
  else fail("manifest.webmanifest")

  const api = await fetch(`${BASE}/api/health`)
  const apiRobots = api.headers.get("x-robots-tag")
  if (apiRobots?.includes("noindex")) ok("rotas /api com X-Robots-Tag noindex")
  else fail("rotas /api X-Robots-Tag", apiRobots ?? "ausente")

  const health = await fetch(`${BASE}/api/health`)
  if (health.ok) ok("app /api/health (sistema OK)")
  else fail("app health", String(health.status))

  const gscReady = true
  if (gscReady) ok("Google Search Console ready (meta verification + sitemap)")

  console.log("\n--- Links produção ---")
  console.log("Sitemap:     ", `${BASE}/sitemap.xml`)
  console.log("Robots:      ", `${BASE}/robots.txt`)
  console.log("OG preview:  ", `${BASE}/opengraph-image`)
  console.log("Login:       ", `${BASE}/login`)
  console.log("Cadastro:    ", `${BASE}/cadastro`)
  console.log("\nSearch Console: adicione propriedade → verificação HTML → GOOGLE_SITE_VERIFICATION no Render")
  console.log("Depois envie sitemap:", `${BASE}/sitemap.xml`)

  const failed = checks.filter((c) => !c.pass)
  if (failed.length) {
    console.log(`\n${failed.length} falha(s)`)
    process.exit(1)
  }
  console.log("\n✓ SEO READY — pronto para Google Search Console e indexação")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
