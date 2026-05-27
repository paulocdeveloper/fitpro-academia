/**
 * Validação de ambiente no arranque do Next.js (dev + build server).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return

  const { logEnvValidationOnStartup } = await import("@/lib/env/load-env")
  logEnvValidationOnStartup()
}
