import type { DetectedFoodItem, MealAnalysisResult } from "@/lib/nutrition/types"
import { MIN_CONFIDENCE, MIN_ITEM_CONFIDENCE } from "@/lib/nutrition/types"
import { aggregateItems, buildLevels, mealQualityFromTotals } from "@/lib/nutrition/macros"
import { getOpenAIConfig } from "@/lib/nutrition/openai-config"
import { assertVisionImageSize, toVisionDataUrl } from "@/lib/nutrition/image-upload"
import { filterValidItems, normalizeMacroItem } from "@/lib/nutrition/validate-macros"
import { refineAllItems } from "@/lib/nutrition/taco-sanity"

const SYSTEM_PROMPT = `Você é nutricionista e especialista em visão computacional focado em REFEIÇÕES BRASILEIRAS.
Analise SOMENTE alimentos claramente visíveis na foto. Responda em português do Brasil.
Retorne JSON válido, sem markdown, seguindo o schema pedido.`

const USER_PROMPT = `Analise esta foto de refeição/prato brasileiro e retorne JSON:
{
  "confianca_geral": number (0-100),
  "resumo": string (1 frase descrevendo o prato),
  "qualidade_refeicao": "excelente"|"boa"|"regular"|"pobre",
  "items": [
    {
      "nome": string (específico: "Arroz branco", "Feijão carioca", "Peito de frango grelhado"),
      "categoria": "proteina"|"carboidrato"|"gordura"|"fibra"|"vegetal"|"bebida"|"industrializado"|"doce"|"fast_food",
      "categorias": string[],
      "quantidade_g": number (porção VISÍVEL em gramas),
      "confianca": number (0-100 por item),
      "kcal": number,
      "proteinas_g": number,
      "carboidratos_g": number,
      "gorduras_g": number,
      "fibras_g": number
    }
  ]
}

REGRAS:
1. Liste TODOS os alimentos visíveis (prato composto: arroz + feijão + frango + salada, etc.).
2. Macros são da PORÇÃO VISÍVEL (não por 100g). Use TACO/porções típicas no Brasil.
3. kcal ≈ (proteinas×4) + (carboidratos×4) + (gorduras×9).
4. Exemplos comuns:
   - Arroz branco → carboidrato (~150-200g no prato)
   - Feijão preto/carioca → carboidrato + proteina (~100-150g)
   - Frango grelhado/assado → proteina (~100-180g)
   - Carne bovina/suína → proteina
   - Salada/legumes → vegetal + fibra
   - Ovo → proteina + gordura
   - Macarrão, batata, mandioca → carboidrato
   - Refrigerante, suco, café, água, cerveja → bebida (inclua copo/garrafa visível)
5. NÃO invente alimentos fora da imagem. Em dúvida, reduza confianca do item.
6. Se não for comida ou estiver ilegível: confianca_geral < 35 e items: [].
7. Separe itens distintos (não agrupe "prato feito" em um único item genérico).`

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
    res = await fetch("https://api.openai.com/v1/chat/completions", {
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
              { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
            ],
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 2800,
        temperature: 0.15,
      }),
      signal: AbortSignal.timeout(55000),
    })
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
