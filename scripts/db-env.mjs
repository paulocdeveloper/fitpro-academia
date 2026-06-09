/**
 * Compatibilidade — scripts usam o loader central de ambiente.
 */
export {
  loadProjectEnv,
  loadEnvFile,
  loadEnvFileIfNeeded,
  getEnvDiagnostics,
  printEnvDiagnostics,
  resolvePostgresConfig,
  resolveDbConfig,
  requireDbConfig,
  getDbDialect,
} from "./env-loader.mjs"
