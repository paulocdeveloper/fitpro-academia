/**
 * Executa qualquer comando com .env carregado automaticamente.
 * Uso: node scripts/with-env.mjs <comando> [args...]
 */
import { spawnSync } from "node:child_process"
import { createRequire } from "node:module"
import { loadProjectEnv } from "./env-loader.mjs"

loadProjectEnv()

const args = process.argv.slice(2)
if (args.length === 0) {
  console.error("Uso: node scripts/with-env.mjs <comando> [args...]")
  process.exit(1)
}

const require = createRequire(import.meta.url)

function run(argv) {
  const [cmd, ...rest] = argv

  if (cmd === "next") {
    const nextBin = require.resolve("next/dist/bin/next")
    return spawnSync(process.execPath, [nextBin, ...rest], {
      stdio: "inherit",
      env: process.env,
      windowsHide: false,
    })
  }

  if (cmd === "node") {
    return spawnSync(process.execPath, rest, {
      stdio: "inherit",
      env: process.env,
      windowsHide: false,
    })
  }

  return spawnSync(cmd, rest, {
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
    windowsHide: false,
  })
}

const result = run(args)
process.exit(result.status ?? 1)
