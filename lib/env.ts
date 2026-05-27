/**
 * API pública de ambiente — validação e detecção automática.
 */
import { loadProjectEnv, validateEnvironment } from "@/lib/env/load-env"

export { loadProjectEnv, validateEnvironment } from "@/lib/env/load-env"

export function ensureEnvLoaded(): void {
  loadProjectEnv()
}

export function isOpenAIConfigured(): boolean {
  ensureEnvLoaded()
  return Boolean(process.env.OPENAI_API_KEY?.trim())
}

export function isSupabaseEnvConfigured(): boolean {
  ensureEnvLoaded()
  return Boolean(
    process.env.DATABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),
  )
}

export function getOpenAIModel(): string {
  ensureEnvLoaded()
  return process.env.OPENAI_VISION_MODEL?.trim() || "gpt-4o"
}

export function getEnvSummaryForHealth() {
  const v = validateEnvironment()
  return {
    runtime: v.runtime,
    validationOk: v.ok,
    required: v.required,
    optional: {
      OPENAI_API_KEY_set: v.optional.OPENAI_API_KEY,
      OPENAI_VISION_MODEL: getOpenAIModel(),
      JWT_SECRET_set: v.optional.JWT_SECRET,
    },
    warnings: v.warnings.length,
    errors: v.errors.length,
  }
}
