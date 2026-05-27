import { loadProjectEnv } from "@/lib/env/load-env"

/** Configuração server-side da OpenAI — nunca expor no client. */
export function getOpenAIConfig() {
  loadProjectEnv()
  const apiKey = process.env.OPENAI_API_KEY?.trim() ?? ""
  const model = process.env.OPENAI_VISION_MODEL?.trim() || "gpt-4o"
  return {
    apiKey,
    model,
    configured: apiKey.length > 0,
  }
}

export function isOpenAIConfigured() {
  return getOpenAIConfig().configured
}
