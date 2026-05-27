import { NextResponse } from "next/server"
import { requireFitnessCoach } from "@/lib/api/require-fitness-coach"
import { buildFitnessUserContext } from "@/lib/fitness-ai/context"
import { loadChatHistory } from "@/lib/fitness-ai/memory-store"
import { resolveAlunoForUser, alunoToPerfil } from "@/lib/treino-inteligente/aluno-record"
import { normalizePerfil } from "@/lib/treino-inteligente/perfil-schema"
import { generateAutoDietaPlano } from "@/lib/nutrition/auto-plan"

export async function GET(req: Request) {
  const auth = await requireFitnessCoach(req)
  if (!auth.ok) return auth.response

  const ctx = await buildFitnessUserContext(auth.session)
  const messages = await loadChatHistory(auth.session.userId, auth.session.academiaId)

  const aluno = await resolveAlunoForUser(auth.session).catch(() => null)
  const perfil = aluno ? normalizePerfil(alunoToPerfil(aluno)) : null
  const autoPlan = perfil ? generateAutoDietaPlano(ctx.displayName, perfil) : null

  return NextResponse.json({
    ok: true,
    context: ctx,
    messages,
    autoPlan,
  })
}
