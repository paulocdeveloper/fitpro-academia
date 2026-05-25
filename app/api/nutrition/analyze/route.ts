import { NextResponse } from "next/server"
import { requirePremiumNutrition } from "@/lib/api/require-premium"
import { analyzeImageQuality } from "@/lib/nutrition/image-quality"
import { isOpenAIConfigured } from "@/lib/nutrition/openai-config"
import { analyzeFood } from "@/lib/nutrition/openai-vision"
import type { MealAnalysisResult } from "@/lib/nutrition/types"

type Body = {
  image?: string
  quality?: MealAnalysisResult["imageQuality"]
}

function logRoute(event: string, payload: Record<string, unknown>) {
  console.info(`[nutrition-analyze:route:${event}]`, payload)
}

function rejectQuality(imageQuality: MealAnalysisResult["imageQuality"]) {
  logRoute("rejected", { engine: "openai", reason: "image_quality", issues: imageQuality.issues })
  return NextResponse.json({
    ok: false,
    confianca_geral: 0,
    qualidade_refeicao: "regular",
    resumo: "Imagem rejeitada pela validação de qualidade.",
    items: [],
    totais: { kcal: 0, proteinas_g: 0, carboidratos_g: 0, gorduras_g: 0, fibras_g: 0 },
    niveis: { proteina: "baixa", carboidrato: "baixa", gordura: "baixa" },
    imageQuality,
    engine: "openai",
    error: imageQuality.issues.join(" "),
  } satisfies MealAnalysisResult)
}

function missingOpenAI(imageQuality: MealAnalysisResult["imageQuality"]) {
  logRoute("rejected", { engine: "fallback", reason: "OPENAI_API_KEY ausente" })
  return NextResponse.json(
    {
      ok: false,
      confianca_geral: 0,
      qualidade_refeicao: "regular",
      resumo: "IA Vision não configurada no servidor.",
      items: [],
      totais: { kcal: 0, proteinas_g: 0, carboidratos_g: 0, gorduras_g: 0, fibras_g: 0 },
      niveis: { proteina: "baixa", carboidrato: "baixa", gordura: "baixa" },
      imageQuality,
      engine: "openai",
      error: "Configure OPENAI_API_KEY no Render para reconhecimento real com GPT-4o Vision.",
    } satisfies MealAnalysisResult,
    { status: 503 },
  )
}

function failureOpenAI(
  imageQuality: MealAnalysisResult["imageQuality"],
  message: string,
): MealAnalysisResult {
  return {
    ok: false,
    confianca_geral: 0,
    qualidade_refeicao: "regular",
    resumo: "Falha na análise Vision.",
    items: [],
    totais: { kcal: 0, proteinas_g: 0, carboidratos_g: 0, gorduras_g: 0, fibras_g: 0 },
    niveis: { proteina: "baixa", carboidrato: "baixa", gordura: "baixa" },
    imageQuality,
    engine: "openai",
    error: message,
  }
}

export async function POST(req: Request) {
  const auth = await requirePremiumNutrition(req)
  if (!auth.ok) return auth.response

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 })
  }

  const image = typeof body.image === "string" ? body.image.trim() : ""
  if (!image) {
    return NextResponse.json({ error: "Imagem obrigatória." }, { status: 400 })
  }

  let imageQuality = body.quality
  if (!imageQuality) {
    imageQuality = { ok: true, score: 70, issues: [] }
  }

  if (!imageQuality.ok) {
    return rejectQuality(imageQuality)
  }

  if (!isOpenAIConfigured()) {
    return missingOpenAI(imageQuality)
  }

  try {
    const outcome = await analyzeFood(image, imageQuality)

    if (outcome.kind === "not_configured") {
      return missingOpenAI(imageQuality)
    }

    if (outcome.kind === "success") {
      logRoute("ok", {
        engine: outcome.result.engine,
        model: outcome.result.model,
        items: outcome.result.items.length,
        confianca: outcome.result.confianca_geral,
      })
      return NextResponse.json(outcome.result)
    }

    if (outcome.kind === "low_confidence") {
      logRoute("low_confidence", {
        engine: outcome.result.engine,
        confianca: outcome.result.confianca_geral,
        error: outcome.result.error,
      })
      return NextResponse.json(outcome.result, { status: 422 })
    }

    logRoute("api_error", { engine: "openai", message: outcome.message })
    return NextResponse.json(failureOpenAI(imageQuality, outcome.message), { status: 503 })
  } catch (e) {
    console.error("POST /api/nutrition/analyze", e)
    return NextResponse.json({ error: "Falha na análise da imagem." }, { status: 500 })
  }
}
