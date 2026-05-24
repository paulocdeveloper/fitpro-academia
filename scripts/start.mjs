/**
 * Arranque compatível com Render (PORT + 0.0.0.0) e desenvolvimento local.
 */
import { spawn } from "node:child_process"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)
const nextBin = require.resolve("next/dist/bin/next")

const port = String(process.env.PORT || "3000")
const host = process.env.HOST || "0.0.0.0"

const child = spawn(process.execPath, [nextBin, "start", "--hostname", host, "--port", port], {
  stdio: "inherit",
  env: process.env,
})

child.on("exit", (code) => process.exit(code ?? 0))
