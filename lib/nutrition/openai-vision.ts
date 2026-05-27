import type { DetectedFoodItem, MealAnalysisResult } from "@/lib/nutrition/types"
import { MIN_CONFIDENCE, MIN_ITEM_CONFIDENCE } from "@/lib/nutrition/types"
import { aggregateItems, buildLevels, mealQualityFromTotals } from "@/lib/nutrition/macros"
import { getOpenAIConfig } from "@/lib/nutrition/openai-config"
import { assertVisionImageSize, toVisionDataUrl } from "@/lib/nutrition/image-upload"
import { filterValidItems, normalizeMacroItem } from "@/lib/nutrition/validate-macros"
import { refineAllItems } from "@/lib/nutrition/taco-sanity"
import { fetchOpenAIWithRetry } from "@/lib/openai-retry"

const SYSTEM_PROMPT = `Você é nutricionista brasileiro e especialista em visão computacional (GPT-4o Vision).
Foco: refeições e pratos típicos do BRASIL. Responda SOMENTE com JSON válido, sem markdown.
Identifique cada alimento visível com nome específico em português do Brasil.`

const USER_PROMPT = `Analise a foto e retorne JSON:
{
  "confianca_geral": number (0-100),
  "resumo": string (1 frase humana descrevendo o prato),
  "qualidade_refeicao": "excelente"|"boa"|"regular"|"pobre",
  "items": [
    {
      "nome": string,
      "categoria": "proteina"|"carboidrato"|"gordura"|"fibra"|"vegetal"|"bebida"|"industrializado"|"doce"|"fast_food",
      "categorias": string[],
      "quantidade_g": number,
      "confianca": number (0-100),
      "kcal": number,
      "proteinas_g": number,
      "carboidratos_g": number,
      "gorduras_g": number,
      "fibras_g": number
    }
  ]
}

ALIMENTOS PRIORITÁRIOS (reconheça com precisão quando visíveis):
arroz branco, feijão (preto/carioca), frango grelhado, carne bovina/suína, ovo, pão, banana, maçã,
macarrão/massa, batata/mandioca, salada/legumes, refrigerante/suco, café, whey/shake,
pizza, hambúrguer, açaí, tapioca.

REGRAS OBRIGATÓRIAS:
1. PRATO COMPOSTO BR: separe SEMPRE itens (ex.: arroz + feijão + frango + salada — 4 itens, não "prato feito").
2. Macros = porção VISÍVEL em gramas (não por 100g). Use TACO e porções típicas BR.
3. kcal ≈ 4×proteínas + 4×carboidratos + 9×gorduras.
4. Porções típicas: arroz 120-200g, feijão 80-150g, frango/carne 80-180g, salada 60-100g, ovo 50g/unidade, pão 40-60g.
5. Bebidas: inclua copo/garrafa visível (refrigerante ~300ml, café ~200ml).
6. Múltiplos alimentos: liste todos os claramente visíveis; em dúvida parcial, inclua com confianca 45-65.
7. Não invente itens invisíveis. Não use nomes genéricos ("comida", "prato").
8. Se imagem escura/borrada mas houver comida: estime com confianca moderada em vez de lista vazia.`

type OpenAiRaw = {
  confianca_geral?: number
  resumo?: string
  qualidade_refeicao?: MealAnalysisResult["qualidade_refeicao"]
  items?: Array<Partial<DetectedFoodItem>>
}

export type OpenAIAnalysisOutcome =
  | { kind: "success"; result: MealAnalysisResult }
  | { kind: "low_confidence"; result: MealAnalysisResult }
  | { kind: "not_configured" }
  | { kind: "api_error"; message: string }

function failureResult(
  imageQuality: MealAnalysisResult["imageQuality"],
  confiancaGeral: number,
  resumo: string,
  error: string,
): MealAnalysisResult {
  return {
    ok: false,
    confianca_geral: confiancaGeral,
    qualidade_refeicao: "regular",
    resumo,
    items: [],
    totais: { kcal: 0, proteinas_g: 0, carboidratos_g: 0, gorduras_g: 0, fibras_g: 0 },
    niveis: { proteina: "baixa", carboidrato: "baixa", gordura: "baixa" },
    imageQuality,
    engine: "openai",
    model: getOpenAIConfig().model,
    error,
  }
}

function logVision(event: string, payload: Record<string, unknown>) {
  console.info(`[nutrition-analyze:${event}]`, payload)
}

/** Reconhecimento real de alimentos via OpenAI Vision (GPT-4o). */
export async function analyzeFood(
  imageBase64: string,
  imageQuality: MealAnalysisResult["imageQuality"],
): Promise<OpenAIAnalysisOutcome> {
  return analyzeWithOpenAI(imageBase64, imageQuality)
}

export async function analyzeWithOpenAI(
  imageBase64: string,
  imageQuality: MealAnalysisResult["imageQuality"],
): Promise<OpenAIAnalysisOutcome> {
  const { apiKey, model, configured } = getOpenAIConfig()
  if (!configured) {
    logVision("engine", { engine: "fallback", reason: "OPENAI_API_KEY ausente" })
    return { kind: "not_configured" }
  }

  const sizeError = assertVisionImageSize(imageBase64)
  if (sizeError) {
    logVision("engine", { engine: "openai", error: sizeError })
    return { kind: "api_error", message: sizeError }
  }

  const dataUrl = toVisionDataUrl(imageBase64)
  logVision("request", {
    engine: "openai",
    model,
    imageBytes: Math.round(dataUrl.length * 0.75),
    qualityScore: imageQuality.score,
  })

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
          model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: [
                { type: "text", text: USER_PROMPT },
                { type: "image_url", image_url: { url: dataUrl, detail: "auto" } },
              ],
            },
          ],
          response_format: { type: "json_object" },
          max_tokens: 2400,
          temperature: 0.15,
        }),
        signal: AbortSignal.timeout(55000),
      },
      { maxAttempts: 3 },
    )
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Timeout ou falha de rede"
    logVision("error", { engine: "openai", stage: "fetch", message: msg })
    return { kind: "api_error", message: msg }
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => "")
    logVision("error", { engine: "openai", status: res.status, body: errText.slice(0, 500) })
    return { kind: "api_error", message: `OpenAI retornou ${res.status}` }
  }

  const payload = await res.json()
  const content = payload?.choices?.[0]?.message?.content
  if (typeof content !== "string") {
    logVision("error", { engine: "openai", stage: "empty_content" })
    return { kind: "api_error", message: "Resposta vazia da OpenAI" }
  }

  logVision("raw", {
    engine: "openai",
    model,
    preview: content.slice(0, 1200),
    length: content.length,
  })

  let raw: OpenAiRaw
  try {
    raw = JSON.parse(content) as OpenAiRaw
  } catch {
    logVision("error", { engine: "openai", stage: "json_parse", preview: content.slice(0, 200) })
    return { kind: "api_error", message: "JSON inválido da OpenAI" }
  }

  let confiancaGeral = Math.min(100, Math.max(0, Number(raw.confianca_geral) || 0))
  const items: DetectedFoodItem[] = (raw.items ?? [])
    .map((it) => normalizeMacroItem(it, confiancaGeral))
    .filter((it): it is DetectedFoodItem => it !== null)

  const refinedItems = refineAllItems(items)
  const validItems = filterValidItems(refinedItems)

  if (validItems.length === 0) {
    logVision("result", { engine: "openai", ok: false, reason: "no_items", confiancaGeral })
    return {
      kind: "low_confidence",
      result: failureResult(
        imageQuality,
        confiancaGeral,
        raw.resumo ?? "Não foi possível identificar alimentos na foto.",
        "Nenhum alimento identificado com confiança suficiente. Recapture com o prato centralizado e boa luz.",
      ),
    }
  }

  const avgItemConf = Math.round(
    validItems.reduce((s, i) => s + i.confianca, 0) / validItems.length,
  )
  confiancaGeral = Math.max(confiancaGeral, avgItemConf)

  const totais = aggregateItems(validItems)
  const niveis = buildLevels(totais)
  const warning =
    confiancaGeral < MIN_CONFIDENCE
      ? `Confiança ${confiancaGeral}% — revise porções antes de salvar.`
      : undefined

  const result: MealAnalysisResult = {
    ok: true,
    confianca_geral: confiancaGeral,
    qualidade_refeicao: raw.qualidade_refeicao ?? mealQualityFromTotals(totais),
    resumo: raw.resumo ?? `Prato com ${validItems.length} alimento(s) identificado(s).`,
    items: validItems,
    totais,
    niveis,
    imageQuality,
    engine: "openai",
    model,
    warning,
  }

  logVision("result", {
    engine: "openai",
    ok: true,
    confiancaGeral,
    items: validItems.length,
    nomes: validItems.map((i) => i.nome),
    warning: warning ?? null,
  })

  return { kind: "success", result }
}
