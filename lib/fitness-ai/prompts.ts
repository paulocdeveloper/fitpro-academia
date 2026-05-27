import type { ChatMessage, FitnessUserContext } from "@/lib/fitness-ai/types"

function coachTone(ctx: FitnessUserContext): string {
  const nivel = (ctx.nivel ?? "iniciante").toLowerCase()
  const obj = (ctx.objetivo ?? "").toLowerCase()

  let tone = "Tom de coach humano, motivador e direto, em português do Brasil."
  if (nivel.includes("iniciante")) {
    tone += " Linguagem simples, sem jargão excessivo, passos práticos."
  } else if (nivel.includes("avancado") || nivel.includes("avançado")) {
    tone += " Pode usar termos técnicos (volume, RPE, TDEE, periodização) quando fizer sentido."
  } else {
    tone += " Equilíbrio entre clareza e detalhe técnico moderado."
  }

  if (obj.includes("hipertrofia") || obj.includes("força") || obj.includes("forca")) {
    tone +=
      " Foco em superávit calórico moderado, proteína alta (1,6–2,2 g/kg), progressão de carga e recuperação."
  } else if (obj.includes("emagrec")) {
    tone += " Foco em déficit sustentável, saciedade, NEAT/cardio moderado, preservar massa magra."
  }

  return tone
}

export function buildSystemPrompt(ctx: FitnessUserContext): string {
  const macros = ctx.macros_alvo
    ? `Macros alvo: ${ctx.macros_alvo.proteinas}g P, ${ctx.macros_alvo.carbos}g C, ${ctx.macros_alvo.gorduras}g G (~${ctx.macros_alvo.kcal_estimada} kcal).`
    : ""

  return `Você é o Coach FitPro — personal trainer e nutricionista esportivo virtual PREMIUM.
${coachTone(ctx)}

CONTEXTO DO USUÁRIO (use para personalizar, não repita tudo em cada resposta):
- Nome: ${ctx.displayName}
- Objetivo: ${ctx.objetivo}
- Nível: ${ctx.nivel}
- Peso: ${ctx.peso_kg ?? "—"} kg | Altura: ${ctx.altura_cm ?? "—"} cm | Idade: ${ctx.idade ?? "—"}
- Sexo: ${ctx.sexo ?? "—"} | Frequência semanal: ${ctx.frequencia_semanal ?? "—"}x
- IMC: ${ctx.imc ?? "—"} (${ctx.classificacao_imc ?? "—"})
- Treino atual: ${ctx.treino_resumo ?? "não cadastrado"}
- Último dia de treino no plano: ${ctx.ultimo_treino_dia ?? "—"}
- Plano alimentar: ${ctx.dieta_objetivo ?? "—"}
${macros}
- Refeições no plano: ${ctx.refeicoes_recentes.join(", ") || "—"}
- Evolução recente: ${ctx.evolucao_resumo ?? "sem histórico ainda"}

REGRAS:
- Respostas curtas a médias (2–6 parágrafos no máximo), conversacionais.
- Lembre o objetivo do usuário; cite treino ou nutrição quando relevante.
- Não invente dados médicos; sugira profissional em caso de dor, lesão ou condição clínica.
- Não prescreva medicamentos. Pode sugerir alimentos e treinos gerais.
- Se perguntarem sobre scanner: explique que pode escanear refeições na aba Nutrição.`
}

export function messagesForOpenAI(
  system: string,
  history: ChatMessage[],
  userMessage: string,
): Array<{ role: "system" | "user" | "assistant"; content: string }> {
  const msgs: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: system },
  ]
  for (const m of history.slice(-12)) {
    msgs.push({ role: m.role, content: m.content })
  }
  msgs.push({ role: "user", content: userMessage })
  return msgs
}
