/** Diagnóstico completo — .env em disco + process.env após carregamento. */
import { existsSync, readFileSync, statSync } from "node:fs"
import { resolve } from "node:path"
import { loadProjectEnv, printEnvDiagnostics } from "./env-loader.mjs"

console.log("=== Ficheiros .env em disco ===\n")

for (const name of [".env", ".env.local"]) {
  const p = resolve(name)
  if (!existsSync(p)) {
    console.log(`${name} → não existe`)
    continue
  }
  const st = statSync(p)
  const lines = readFileSync(p, "utf8").split(/\r?\n/)
  const keys = lines
    .filter((l) => l.trim() && !l.startsWith("#"))
    .map((l) => l.split("=")[0].trim())
  console.log(`${name}`)
  console.log("  modificado:", st.mtime.toISOString())
  console.log("  chaves:", keys.join(", ") || "(vazio)")
}

console.log("\n=== process.env após loadProjectEnv ===\n")
loadProjectEnv()
printEnvDiagnostics()
