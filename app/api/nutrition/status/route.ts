import { NextResponse } from "next/server"
import { requireStaff } from "@/lib/api/require-auth"
import { getOpenAIConfig } from "@/lib/nutrition/openai-config"

/** Status da IA nutricional (sem expor API key). */
export async function GET(req: Request) {
  const auth = await requireStaff(req)
  if (!auth.ok) return auth.response

  const { configured, model } = getOpenAIConfig()

  return NextResponse.json({
    ok: true,
    vision: {
      configured,
      model: configured ? model : null,
      engine: configured ? "openai" : "heuristic",
    },
  })
}
