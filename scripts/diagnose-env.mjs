/** Diagnóstico rápido — confirma se OPENAI está no .env em disco. */
import { existsSync, readFileSync, statSync } from "node:fs"
import { resolve } from "node:path"

const paths = [".env", ".env.local"].map((p) => resolve(p))

for (const p of paths) {
  if (!existsSync(p)) {
    console.log(p, "→ não existe")
    continue
  }
  const st = statSync(p)
  const lines = readFileSync(p, "utf8").split(/\r?\n/)
  const keys = lines
    .filter((l) => l.trim() && !l.startsWith("#"))
    .map((l) => l.split("=")[0].trim())
  const openai = lines.find((l) => l.startsWith("OPENAI_API_KEY="))
  const val = openai?.split("=").slice(1).join("=").trim()
  console.log(p)
  console.log("  modificado:", st.mtime.toISOString())
  console.log("  tamanho:", st.size, "bytes")
  console.log("  chaves:", keys.join(", "))
  console.log("  OPENAI_API_KEY:", val && val.length > 8 ? `presente (${val.length} chars)` : "AUSENTE")
  console.log("  RENDER_API_KEY:", lines.some((l) => l.startsWith("RENDER_API_KEY=") && l.length > 20) ? "presente" : "ausente")
}

const fromEnv = process.env.OPENAI_API_KEY?.trim()
if (fromEnv) console.log("\nprocess.env.OPENAI_API_KEY: presente")
else console.log("\nprocess.env.OPENAI_API_KEY: ausente")
