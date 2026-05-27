import { NextResponse } from "next/server"
import { requirePremiumNutrition } from "@/lib/api/require-premium"
import { analyzeMealComplete } from "@/lib/nutrition/analyze-meal"
import type { MealAnalysisResult } from "@/lib/nutrition/types"

type Body = {
  image?: string
  quality?: MealAnalysisResult["imageQuality"]
  /** RGBA do frame (opcional) para fallback por cor no servidor. */
  pixels?: number[]
}

function logRoute(event: string, payload: Record<string, unknown>) {
  console.info(`[nutrition-analyze:route:${event}]`, payload)
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

  // Mesmo com qualidade baixa, seguimos com fallback BR (nunca tela vazia).
  const qualityForAnalyze = {
    ...imageQuality,
    ok: true,
    issues: imageQuality.issues ?? [],
  }

  try {
    const result = await analyzeMealComplete({
      image,
      imageQuality: qualityForAnalyze,
      pixels: Array.isArray(body.pixels) ? body.pixels : undefined,
    })

    logRoute("ok", {
      engine: result.engine,
      model: result.model ?? null,
      items: result.items.length,
      confianca: result.confianca_geral,
      ok: result.ok,
    })

    return NextResponse.json({
      ...result,
      ok: result.items.length > 0 ? true : result.ok,
      imageQuality,
    })
  } catch (e) {
    console.error("POST /api/nutrition/analyze", e)
    const fallback = await import("@/lib/nutrition/br-fallback").then((m) =>
      m.analyzeWithBrFallback(qualityForAnalyze),
    )
    logRoute("fallback-after-error", { items: fallback.items.length })
    return NextResponse.json({ ...fallback, ok: true, imageQuality })
  }
}
