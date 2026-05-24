/**
 * Valida scanner mobile (código + produção com UA mobile).
 */
import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"

const BASE = process.env.PROD_URL ?? "https://fitpro-academia.onrender.com"
const SCANNER = resolve("components/nutrition/food-scanner.tsx")
const LAYOUT = resolve("app/layout.tsx")

console.log("=== Validação Scanner Mobile ===\n")

let ok = true
const scanner = readFileSync(SCANNER, "utf8")
const layout = existsSync(LAYOUT) ? readFileSync(LAYOUT, "utf8") : ""

const checks = [
  ["Câmera traseira padrão (environment)", /useState<CameraFacing>\("environment"\)/.test(scanner)],
  ["Autofocus contínuo", /focusMode.*continuous/.test(scanner)],
  ["Estabilização antes da captura (≥55%)", /stability < 0\.55/.test(scanner)],
  ["playsInline (iOS Safari)", /playsInline/.test(scanner)],
  ["Toggle câmera traseira/frontal", /SwitchCamera/.test(scanner)],
  ["Overlay visual de scan", /ScanLine|scan overlay/i.test(scanner)],
  ["Loading IA (SCAN_STEPS)", /SCAN_STEPS/.test(scanner)],
  ["Badge GPT-4o Vision", /GPT-4o Vision/.test(scanner)],
  ["Validação qualidade imagem", /captureFrameQuality/.test(scanner)],
  ["Viewport mobile no layout", /viewportFit|viewport/i.test(layout)],
]

for (const [label, pass] of checks) {
  console.log(pass ? "✓" : "✗", label)
  if (!pass) ok = false
}

const uas = [
  { name: "Chrome Android", ua: "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36" },
  { name: "Safari iPhone", ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1" },
]

console.log("\n--- Páginas mobile (produção) ---")
for (const { name, ua } of uas) {
  try {
    const res = await fetch(`${BASE}/dietas`, {
      headers: { "User-Agent": ua },
      redirect: "manual",
    })
    const pass = res.status === 307 || res.status === 302 || res.status === 200
    console.log(pass ? "✓" : "✗", `${name} → /dietas (${res.status})`)
    if (!pass) ok = false
  } catch (e) {
    console.log("✗", name, e.message)
    ok = false
  }
}

console.log("\n--- Login mobile ---")
for (const { name, ua } of uas) {
  const res = await fetch(`${BASE}/login`, { headers: { "User-Agent": ua } })
  const html = await res.text()
  const pass = res.status === 200 && html.includes("viewport")
  console.log(pass ? "✓" : "✗", `${name} → /login`)
  if (!pass) ok = false
}

console.log(ok ? "\n✓ Scanner mobile OK (código + rotas)" : "\n✗ Falhas no scanner mobile")
process.exit(ok ? 0 : 1)
