/**
 * Libera a porta antes de subir o Next (evita EADDRINUSE no WSL/Windows).
 * Uso: node ./scripts/kill-port.mjs 3000
 */
import { execSync } from "node:child_process"

const port = process.argv[2] || "3000"
const isWin = process.platform === "win32"

try {
  if (isWin) {
    const out = execSync(`netstat -ano | findstr :${port}`, { encoding: "utf8" })
    const pids = new Set(
      out
        .split("\n")
        .map((l) => l.trim().split(/\s+/).pop())
        .filter((p) => p && /^\d+$/.test(p)),
    )
    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" })
        console.log(`Processo ${pid} encerrado (porta ${port})`)
      } catch {
        /* ignorar */
      }
    }
  } else {
    execSync(`fuser -k ${port}/tcp 2>/dev/null || true`, { stdio: "inherit", shell: true })
    console.log(`Porta ${port} liberada`)
  }
} catch {
  console.log(`Nenhum processo na porta ${port} (ou já livre)`)
}
