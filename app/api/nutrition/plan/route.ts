import { NextResponse } from "next/server"
import { requirePremiumNutrition } from "@/lib/api/require-premium"
import { buildFitnessUserContext } from "@/lib/fitness-ai/context"
import { resolveAlunoForUser, alunoToPerfil } from "@/lib/treino-inteligente/aluno-record"
import { normalizePerfil } from "@/lib/treino-inteligente/perfil-schema"
import { generateAutoDietaPlano } from "@/lib/nutrition/auto-plan"

/** Plano alimentar automático baseado no perfil fitness. */
export async function GET(req: Request) {
  const auth = await requirePremiumNutrition(req)
  if (!auth.ok) return auth.response

  const ctx = await buildFitnessUserContext(auth.session)
  const aluno = await resolveAlunoForUser(auth.session).catch(() => null)
  if (!aluno) {
    return NextResponse.json(
      { error: "Complete seu perfil em IA Treino para gerar o plano." },
      { status: 404 },
    )
  }

  const perfil = normalizePerfil(alunoToPerfil(aluno))
  const plano = generateAutoDietaPlano(ctx.displayName, perfil)

  return NextResponse.json({ ok: true, plano, context: ctx })
}
