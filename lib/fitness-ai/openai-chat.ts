import { getOpenAIConfig } from "@/lib/nutrition/openai-config"
import { fetchOpenAIWithRetry } from "@/lib/openai-retry"

export type ChatCompletionResult =
  | { ok: true; reply: string; model: string }
  | { ok: false; reason: "not_configured" | "api_error"; message: string }

export async function completeFitnessChat(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
): Promise<ChatCompletionResult> {
  const { apiKey, model, configured } = getOpenAIConfig()
  if (!configured) {
    return { ok: false, reason: "not_configured", message: "OPENAI_API_KEY não configurada." }
  }

  const chatModel = process.env.OPENAI_CHAT_MODEL?.trim() || "gpt-4o-mini"

  let res: Response
  try {
    res = await fetchOpenAIWithRetry(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: chatModel,
          messages,
          max_tokens: 900,
          temperature: 0.65,
        }),
        signal: AbortSignal.timeout(45000),
      },
      { maxAttempts: 3 },
    )
  } catch (e) {
    return {
      ok: false,
      reason: "api_error",
      message: e instanceof Error ? e.message : "Falha de rede",
    }
  }

  if (!res.ok) {
    const t = await res.text().catch(() => "")
    return { ok: false, reason: "api_error", message: `OpenAI ${res.status}: ${t.slice(0, 200)}` }
  }

  const data = await res.json()
  const content = data?.choices?.[0]?.message?.content
  if (typeof content !== "string" || !content.trim()) {
    return { ok: false, reason: "api_error", message: "Resposta vazia" }
  }

  return { ok: true, reply: content.trim(), model: chatModel }
}

/** Resposta local quando OpenAI indisponível. */
export function localCoachFallback(
  userMessage: string,
  ctx: import("@/lib/fitness-ai/types").FitnessUserContext,
): string {
  const msg = userMessage.toLowerCase()
  const nome = ctx.displayName.split(" ")[0]
  const obj = ctx.objetivo

  if (/oi|ol[aá]|bom dia|boa tarde|boa noite/.test(msg)) {
    return `Fala, ${nome}! Sou seu coach FitPro. Vi que seu foco é **${obj}**. Como posso te ajudar hoje — treino, nutrição ou evolução?`
  }
  if (/treino|exerc[ií]cio|s[eé]rie/.test(msg)) {
    return `${nome}, pelo seu perfil (${ctx.nivel}), mantenha a frequência de ${ctx.frequencia_semanal ?? 3}x/semana. ${
      ctx.treino_resumo ? `Seu plano atual: ${ctx.treino_resumo}.` : "Complete seu perfil em IA Treino para um plano personalizado."
    } Priorize execução correta e progressão gradual.`
  }
  if (/dieta|comida|macro|caloria|prote[ií]na/.test(msg)) {
    const m = ctx.macros_alvo
    return m
      ? `${nome}, para **${obj}** mire em ~${m.kcal_estimada} kcal/dia (${m.proteinas}g proteína, ${m.carbos}g carbo, ${m.gorduras}g gordura). Use o scanner em Nutrição para registrar refeições com precisão.`
      : `${nome}, ajuste proteína e calorias ao objetivo **${obj}**. Escaneie suas refeições no app para acompanhar macros em tempo real.`
  }
  if (/emagrec|gordura|perder peso/.test(msg)) {
    return `${nome}, para emagrecimento: déficit moderado (~300–500 kcal), proteína alta, passos diários e treino de força 3x/sem para manter músculo. Quer um exemplo de dia alimentar?`
  }
  if (/hipertrofia|massa|ganhar/.test(msg)) {
    return `${nome}, hipertrofia pede superávit leve, 1,6–2g proteína/kg e progressão nas cargas. ${ctx.treino_resumo ?? "Monte seu treino em IA Treino."} Durma bem — é onde o músculo cresce.`
  }

  return `${nome}, entendi. Com objetivo **${obj}** e IMC ${ctx.imc ?? "—"}, siga consistente no treino e na alimentação. Me conte se quer foco em treino, dieta ou recuperação — estou aqui como seu coach FitPro.`
}
