/**
 * Valida SEO em produção. Uso: node scripts/validate-seo.mjs
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

async function fetchText(path) {
  const res = await fetch(`${BASE}${path}`)
  return { status: res.status, text: await res.text(), headers: res.headers }
}

async function main() {
  console.log("=== Validação SEO ===")
  console.log("URL:", BASE, "\n")

  const sitemap = await fetchText("/sitemap.xml")
  if (sitemap.status === 200 && sitemap.text.includes("<loc>") && sitemap.text.includes("/login")) {
    ok("sitemap.xml")
  } else fail("sitemap.xml", `status ${sitemap.status}`)

  const robots = await fetchText("/robots.txt")
  if (robots.status === 200 && robots.text.includes("Sitemap:") && robots.text.includes("Disallow: /dashboard")) {
    ok("robots.txt")
  } else fail("robots.txt")

  const login = await fetchText("/login")
  if (login.status === 200) {
    const html = login.text
    if (html.includes("FitPro Academia")) ok("title / brand no HTML")
    else fail("title / brand")
    if (html.includes('name="description"')) ok("meta description")
    else fail("meta description")
    if (html.includes("og:title") || html.includes('property="og:title"')) ok("Open Graph title")
    else fail("Open Graph title")
    if (html.includes("twitter:card")) ok("Twitter card")
    else fail("Twitter card")
    if (html.includes("canonical")) ok("canonical URL")
    else fail("canonical URL")
    if (html.includes("application/ld+json")) ok("schema.org JSON-LD")
    else fail("schema.org JSON-LD")
    if (html.includes('name="viewport"')) ok("viewport mobile")
    else fail("viewport mobile")
    if (html.includes("robots")) ok("robots meta")
    else fail("robots meta")
  } else fail("/login", `status ${login.status}`)

  const og = await fetch(`${BASE}/opengraph-image`)
  if (og.status === 200 && og.headers.get("content-type")?.includes("image")) {
    ok("opengraph-image (preview social)")
  } else fail("opengraph-image", `status ${og.status}`)

  const manifest = await fetchText("/manifest.webmanifest")
  if (manifest.status === 200 && manifest.text.includes("FitPro")) ok("manifest.webmanifest")
  else fail("manifest.webmanifest")

  const dash = await fetch(`${BASE}/dashboard`, { redirect: "manual" })
  const dashRobots = dash.headers.get("x-robots-tag")
  if (dashRobots?.includes("noindex")) ok("dashboard X-Robots-Tag noindex")
  else fail("dashboard X-Robots-Tag", dashRobots ?? "ausente")

  const health = await fetch(`${BASE}/api/health`)
  if (health.ok) ok("app /api/health (sistema OK)")
  else fail("app health", String(health.status))

  console.log("\n--- Links ---")
  console.log("Sitemap:", `${BASE}/sitemap.xml`)
  console.log("Robots:", `${BASE}/robots.txt`)
  console.log("OG preview:", `${BASE}/opengraph-image`)
  console.log("Login (Google preview):", `${BASE}/login`)

  const failed = checks.filter((c) => !c.pass)
  if (failed.length) {
    console.log(`\n${failed.length} falha(s)`)
    process.exit(1)
  }
  console.log("\n✓ SEO pronto para Google Search Console e indexação")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
