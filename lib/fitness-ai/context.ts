import { query } from "@/lib/db"
import { displayNameFrom } from "@/lib/auth/user-display"
import { perfilToRole } from "@/lib/auth/roles"
import type { JwtPayloadUser } from "@/lib/auth/jwt"
import { loadUserSubscription } from "@/lib/premium/subscription"
import { resolveAlunoForUser, alunoToPerfil } from "@/lib/treino-inteligente/aluno-record"
import { normalizePerfil } from "@/lib/treino-inteligente/perfil-schema"
import { calcularImc, classificarImc } from "@/lib/treino-inteligente/generator"
import { fetchTreinoInteligenteGerado } from "@/lib/treino-inteligente/persist-treino"
import { generateAutoDietaPlano } from "@/lib/nutrition/auto-plan"
import type { FitnessUserContext } from "@/lib/fitness-ai/types"

export async function buildFitnessUserContext(session: JwtPayloadUser): Promise<FitnessUserContext> {
  const usuario = await query<{ nome: string | null; perfil: string | null }>(
    `SELECT nome, perfil::text AS perfil FROM usuarios WHERE id = ? LIMIT 1`,
    [session.userId],
  )
  const nome = usuario[0]?.nome ?? null
  const role = perfilToRole(usuario[0]?.perfil)
  const displayName = displayNameFrom(nome, role)
  const subscription = await loadUserSubscription(session.userId, role)

  const aluno = await resolveAlunoForUser(session).catch(() => null)
  const perfil = aluno ? normalizePerfil(alunoToPerfil(aluno)) : null

  let treino_resumo: string | null = null
  let ultimo_treino_dia: string | null = null
  let imc: number | null = null
  let classificacao_imc: string | null = null

  if (perfil) {
    imc = calcularImc(perfil.peso_kg, perfil.altura_cm)
    classificacao_imc = classificarImc(imc)
    const treino = await fetchTreinoInteligenteGerado(session.userId, session.academiaId).catch(() => null)
    if (treino) {
      treino_resumo = `${treino.split} · ${treino.objetivo} · progresso ${treino.progresso_pct}%`
      ultimo_treino_dia = treino.dias[0]?.nome ?? null
    }
  }

  const plano = perfil ? generateAutoDietaPlano(displayName, perfil) : null
  const kcal_est =
    plano &&
    Math.round(plano.proteinas * 4 + plano.carbos * 4 + plano.gorduras * 9)

  const historico = await query<{ created_at: string; progresso_pct: number; imc: number }>(
    `SELECT created_at, progresso_pct, imc FROM treino_inteligente_historico
     WHERE user_id = ? AND academia_id = ? ORDER BY id DESC LIMIT 3`,
    [session.userId, session.academiaId],
  ).catch(() => [])

  const evolucao_resumo =
    historico.length > 0
      ? historico
          .map((h) => `${new Date(h.created_at).toLocaleDateString("pt-BR")}: IMC ${h.imc}, ${h.progresso_pct}%`)
          .join(" · ")
      : null

  return {
    displayName,
    objetivo: perfil?.objetivo ?? aluno?.objetivo ?? "Saúde",
    nivel: perfil?.nivel ?? aluno?.nivel ?? "iniciante",
    peso_kg: perfil?.peso_kg ?? aluno?.peso ?? null,
    altura_cm: perfil?.altura_cm ?? aluno?.altura ?? null,
    idade: perfil?.idade ?? aluno?.idade ?? null,
    sexo: perfil?.sexo ?? aluno?.sexo ?? null,
    frequencia_semanal: perfil?.frequencia_semanal ?? aluno?.frequencia_semanal ?? null,
    imc,
    classificacao_imc,
    treino_resumo,
    ultimo_treino_dia,
    dieta_objetivo: plano?.objetivo ?? null,
    macros_alvo: plano
      ? {
          proteinas: plano.proteinas,
          carbos: plano.carbos,
          gorduras: plano.gorduras,
          kcal_estimada: kcal_est ?? 0,
        }
      : null,
    refeicoes_recentes: plano?.refeicoes.flatMap((r) => r.alimentos.map((a) => a.item)).slice(0, 8) ?? [],
    evolucao_resumo,
    isPremium: subscription.isPremium,
  }
}
