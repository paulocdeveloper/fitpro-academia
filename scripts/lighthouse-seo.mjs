/**
 * Lighthouse SEO/Performance em produção.
 * Uso: node scripts/lighthouse-seo.mjs [url]
 */
import { spawnSync } from "node:child_process"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"

const BASE = process.argv[2] ?? process.env.PROD_URL ?? "https://fitpro-academia.onrender.com/login"
const OUT = resolve(process.cwd(), "lh-seo-pro.json")

console.log("=== Lighthouse (mobile) ===")
console.log("URL:", BASE, "\n")

const args = [
  BASE,
  "--only-categories=performance,accessibility,best-practices,seo",
  "--form-factor=mobile",
  "--screenEmulation.mobile=true",
  "--output=json",
  `--output-path=${OUT}`,
  "--quiet",
  "--chrome-flags=--headless --no-sandbox --disable-gpu",
]

const bin = process.platform === "win32" ? "npx.cmd" : "npx"
const run = spawnSync(bin, ["--yes", "lighthouse", ...args], {
  stdio: "inherit",
  shell: process.platform === "win32",
})

if (run.status !== 0 && !existsSync(OUT)) {
  console.error("Lighthouse falhou — use PageSpeed Insights como alternativa")
  process.exit(1)
}

const report = JSON.parse(readFileSync(OUT, "utf8"))
const scores = {
  performance: report.categories?.performance?.score,
  accessibility: report.categories?.accessibility?.score,
  bestPractices: report.categories?.["best-practices"]?.score,
  seo: report.categories?.seo?.score,
}

function pct(n) {
  return n == null ? "n/a" : Math.round(n * 100)
}

console.log("\n--- Scores ---")
console.log("Performance:    ", pct(scores.performance))
console.log("Accessibility:  ", pct(scores.accessibility))
console.log("Best Practices: ", pct(scores.bestPractices))
console.log("SEO:            ", pct(scores.seo))

writeFileSync(
  resolve(process.cwd(), "lh-seo-summary.json"),
  JSON.stringify(
    {
      url: BASE,
      fetchedAt: new Date().toISOString(),
      scores: {
        performance: pct(scores.performance),
        accessibility: pct(scores.accessibility),
        bestPractices: pct(scores.bestPractices),
        seo: pct(scores.seo),
      },
    },
    null,
    2,
  ),
)

if (scores.seo != null && scores.seo < 0.9) {
  console.log("\n✗ SEO Lighthouse abaixo de 90")
  process.exit(1)
}

console.log("\n✓ Lighthouse concluído — relatório:", OUT)
