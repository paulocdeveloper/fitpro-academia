import { NextResponse } from "next/server"
import { requireStaff } from "@/lib/api/require-auth"
import { analyzeWithHeuristic } from "@/lib/nutrition/heuristic-vision"
import { analyzeImageQuality } from "@/lib/nutrition/image-quality"
import { analyzeWithOpenAI } from "@/lib/nutrition/openai-vision"
import type { MealAnalysisResult } from "@/lib/nutrition/types"

type Body = {
  image?: string
  pixels?: number[]
  width?: number
  height?: number
  quality?: MealAnalysisResult["imageQuality"]
}

export async function POST(req: Request) {
  const auth = await requireStaff(req)
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
    imageQuality = { ok: true, score: 70, issues: [], }
  }

  if (!imageQuality.ok) {
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

  try {
    const openAiResult = await analyzeWithOpenAI(image, imageQuality)
    if (openAiResult) {
      return NextResponse.json(openAiResult)
    }

    if (pixels && body.width && body.height) {
      const heuristic = analyzeWithHeuristic(pixels, imageQuality)
      return NextResponse.json(heuristic)
    }

    return NextResponse.json({
      ok: false,
      confianca_geral: 0,
      qualidade_refeicao: "regular",
      resumo: "Análise avançada indisponível.",
      items: [],
      totais: { kcal: 0, proteinas_g: 0, carboidratos_g: 0, gorduras_g: 0, fibras_g: 0 },
      niveis: { proteina: "baixa", carboidrato: "baixa", gordura: "baixa" },
      imageQuality,
      engine: "heuristic",
      error: "Configure OPENAI_API_KEY no servidor para reconhecimento inteligente de alimentos.",
    } satisfies MealAnalysisResult)
  } catch (e) {
    console.error("POST /api/nutrition/analyze", e)
    return NextResponse.json({ error: "Falha na análise da imagem." }, { status: 500 })
  }
}
