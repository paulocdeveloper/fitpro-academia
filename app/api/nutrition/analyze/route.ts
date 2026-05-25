import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/api/require-auth"
import { analyzeWithHeuristic } from "@/lib/nutrition/heuristic-vision"
import { analyzeImageQuality } from "@/lib/nutrition/image-quality"
import { isOpenAIConfigured } from "@/lib/nutrition/openai-config"
import { analyzeWithOpenAI } from "@/lib/nutrition/openai-vision"
import type { MealAnalysisResult } from "@/lib/nutrition/types"

type Body = {
  image?: string
  pixels?: number[]
  width?: number
  height?: number
  quality?: MealAnalysisResult["imageQuality"]
}

function rejectQuality(imageQuality: MealAnalysisResult["imageQuality"]) {
  return NextResponse.json({
    ok: false,
    confianca_geral: 0,
    qualidade_refeicao: "regular",
    resumo: "Imagem rejeitada pela validação de qualidade.",
    items: [],
    totais: { kcal: 0, proteinas_g: 0, carboidratos_g: 0, gorduras_g: 0, fibras_g: 0 },
    niveis: { proteina: "baixa", carboidrato: "baixa", gordura: "baixa" },
    imageQuality,
    engine: "heuristic",
    error: imageQuality.issues.join(" "),
  } satisfies MealAnalysisResult)
}

function missingOpenAI(imageQuality: MealAnalysisResult["imageQuality"]) {
  return NextResponse.json({
    ok: false,
    confianca_geral: 0,
    qualidade_refeicao: "regular",
    resumo: "IA Vision não configurada no servidor.",
    items: [],
    totais: { kcal: 0, proteinas_g: 0, carboidratos_g: 0, gorduras_g: 0, fibras_g: 0 },
    niveis: { proteina: "baixa", carboidrato: "baixa", gordura: "baixa" },
    imageQuality,
    engine: "heuristic",
    error: "Configure OPENAI_API_KEY no Render para reconhecimento real com GPT-4o Vision.",
  } satisfies MealAnalysisResult)
}

export async function POST(req: Request) {
  const auth = await requireAuth(req)
  if (!auth.ok) return auth.response

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 })
  }

  const image = typeof body.image === "string" ? body.image.trim() : ""
  if (!image && !body.pixels?.length) {
    return NextResponse.json({ error: "Imagem obrigatória." }, { status: 400 })
  }

  let imageQuality = body.quality
  let pixels: Uint8ClampedArray | null = null

  if (body.pixels && body.width && body.height) {
    pixels = new Uint8ClampedArray(body.pixels)
    if (!imageQuality) {
      imageQuality = analyzeImageQuality(pixels, body.width, body.height)
    }
  }

  if (!imageQuality) {
    imageQuality = { ok: true, score: 70, issues: [] }
  }

  if (!imageQuality.ok) {
    return rejectQuality(imageQuality)
  }

  if (!image) {
    return NextResponse.json({ error: "Imagem base64 obrigatória para análise Vision." }, { status: 400 })
  }

  try {
    if (!isOpenAIConfigured()) {
      if (pixels && body.width && body.height) {
        const heuristic = analyzeWithHeuristic(pixels, imageQuality)
        return NextResponse.json({
          ...heuristic,
          error: heuristic.error ?? "OPENAI_API_KEY ausente — usando fallback visual limitado.",
        })
      }
      return missingOpenAI(imageQuality)
    }

    const outcome = await analyzeWithOpenAI(image, imageQuality)

    if (outcome.kind === "not_configured") {
      return missingOpenAI(imageQuality)
    }

    if (outcome.kind === "success" || outcome.kind === "low_confidence") {
      return NextResponse.json(outcome.result)
    }

    // API error — fallback heurístico apenas se temos pixels
    if (pixels && body.width && body.height) {
      const heuristic = analyzeWithHeuristic(pixels, imageQuality)
      return NextResponse.json({
        ...heuristic,
        error: `Vision indisponível (${outcome.message}). Resultado visual aproximado.`,
      })
    }

    return NextResponse.json(
      failureOpenAI(imageQuality, outcome.message),
      { status: 503 },
    )
  } catch (e) {
    console.error("POST /api/nutrition/analyze", e)
    return NextResponse.json({ error: "Falha na análise da imagem." }, { status: 500 })
  }
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
