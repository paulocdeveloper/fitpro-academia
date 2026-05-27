import { NextResponse } from "next/server"
import { requirePremiumNutrition } from "@/lib/api/require-premium"
import { getOpenAIConfig } from "@/lib/nutrition/openai-config"

/** Status da IA nutricional (sem expor API key). */
export async function GET(req: Request) {
  const auth = await requirePremiumNutrition(req)
  if (!auth.ok) return auth.response

  const { configured, model } = getOpenAIConfig()

  return NextResponse.json({
    ok: true,
    vision: {
      configured,
      model: configured ? model : null,
      engine: configured ? "openai" : "heuristic",
      fallbackBr: true,
      chatModel: process.env.OPENAI_CHAT_MODEL?.trim() || "gpt-4o-mini",
    },
  })
}
