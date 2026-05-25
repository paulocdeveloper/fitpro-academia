/**
 * Valida variáveis obrigatórias e opcionais; diagnóstico completo do ambiente.
 */
import { loadProjectEnv, printEnvDiagnostics } from "./env-loader.mjs"

loadProjectEnv()
const ok = printEnvDiagnostics()
process.exit(ok ? 0 : 1)
