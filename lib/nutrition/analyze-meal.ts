import type { MealAnalysisResult } from "@/lib/nutrition/types"
import { isOpenAIConfigured } from "@/lib/nutrition/openai-config"
import { analyzeFood, type OpenAIAnalysisOutcome } from "@/lib/nutrition/openai-vision"
import { analyzeWithBrFallback } from "@/lib/nutrition/br-fallback"

export type AnalyzeMealInput = {
  image: string
  imageQuality: MealAnalysisResult["imageQuality"]
  /** Pixels RGBA opcionais (client) para fallback por cor. */
  pixels?: number[]
}

function logAnalyze(event: string, payload: Record<string, unknown>) {
  console.info(`[nutrition-analyze:${event}]`, payload)
}

function shouldUseFallback(outcome: OpenAIAnalysisOutcome | null, reason: string): boolean {
  if (!outcome) return true
  if (outcome.kind === "not_configured" || outcome.kind === "api_error") return true
  if (outcome.kind === "low_confidence") return true
  if (outcome.kind === "success" && outcome.result.items.length === 0) return true
  return false
}

/**
 * Orquestra Vision + fallback BR.
 * Sempre tenta retornar itens utilizáveis (ok: true) quando possível.
 */
export async function analyzeMealComplete(input: AnalyzeMealInput): Promise<MealAnalysisResult> {
  const { image, imageQuality } = input
  const pixels =
    input.pixels?.length && input.pixels.length > 64
      ? new Uint8ClampedArray(input.pixels)
      : undefined

  let openaiOutcome: OpenAIAnalysisOutcome | null = null

  if (isOpenAIConfigured()) {
    try {
      openaiOutcome = await analyzeFood(image, imageQuality)
    } catch (e) {
      logAnalyze("openai-throw", { message: e instanceof Error ? e.message : String(e) })
      openaiOutcome = { kind: "api_error", message: "Falha OpenAI" }
    }
  } else {
    logAnalyze("skip-openai", { reason: "not_configured" })
  }

  if (openaiOutcome?.kind === "success" && openaiOutcome.result.items.length > 0) {
    logAnalyze("result", { engine: "openai", items: openaiOutcome.result.items.length })
    return { ...openaiOutcome.result, ok: true }
  }

  const partial =
    openaiOutcome?.kind === "low_confidence" && openaiOutcome.result.items.length > 0
      ? openaiOutcome.result.items
      : openaiOutcome?.kind === "success"
        ? openaiOutcome.result.items
        : undefined

  const reason =
    openaiOutcome?.kind === "api_error"
      ? openaiOutcome.message
      : openaiOutcome?.kind === "low_confidence"
        ? "low_confidence"
        : "fallback"

  if (shouldUseFallback(openaiOutcome, reason)) {
    logAnalyze("fallback-br", { reason, partial: partial?.length ?? 0 })
    const fallback = analyzeWithBrFallback(imageQuality, {
      partialItems: partial,
      pixels,
      hintText: partial?.map((i) => i.nome).join(" "),
    })
    if (openaiOutcome?.kind === "success" || openaiOutcome?.kind === "low_confidence") {
      const visionConf = openaiOutcome.result.confianca_geral
      if (visionConf > fallback.confianca_geral) {
        fallback.confianca_geral = Math.round((visionConf + fallback.confianca_geral) / 2)
      }
    }
    return fallback
  }

  return (
    openaiOutcome as { kind: "success"; result: MealAnalysisResult }
  ).result
}
