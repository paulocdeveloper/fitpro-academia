import type { DetectedFoodItem, MealAnalysisResult } from "@/lib/nutrition/types"
import { MIN_CONFIDENCE } from "@/lib/nutrition/types"
import { aggregateItems, buildLevels, mealQualityFromTotals } from "@/lib/nutrition/macros"
import { getOpenAIConfig } from "@/lib/nutrition/openai-config"
import { filterValidItems, normalizeMacroItem } from "@/lib/nutrition/validate-macros"
import { refineAllItems } from "@/lib/nutrition/taco-sanity"

const SYSTEM_PROMPT = `Você é uma IA nutricional especializada em comida brasileira e reconhecimento visual de pratos.
Analise APENAS o que é visível na imagem. Responda em português do Brasil.
Retorne JSON válido (sem markdown) seguindo exatamente o schema solicitado.`

const USER_PROMPT = `Analise esta foto de refeição/prato e retorne JSON com:
{
  "confianca_geral": number (0-100, confiança na identificação do prato),
  "resumo": string (1 frase descrevendo o prato em português),
  "qualidade_refeicao": "excelente"|"boa"|"regular"|"pobre",
  "items": [
    {
      "nome": string (nome específico em português, ex: "Arroz branco", "Peito de frango grelhado"),
      "categoria": "proteina"|"carboidrato"|"gordura"|"fibra"|"vegetal"|"bebida"|"industrializado"|"doce"|"fast_food",
      "categorias": string[] (todas aplicáveis),
      "quantidade_g": number (porção visível estimada em gramas),
      "confianca": number (0-100 por item),
      "kcal": number (calorias da porção estimada),
      "proteinas_g": number,
      "carboidratos_g": number,
      "gorduras_g": number,
      "fibras_g": number
    }
  ]
}

REGRAS OBRIGATÓRIAS:
1. Identifique TODOS os alimentos visíveis (múltiplos itens no mesmo prato).
2. Use referências nutricionais realistas (Tabela TACO / porções brasileiras comuns).
3. Macros são da PORÇÃO VISÍVEL, não por 100g.
4. kcal deve ser coerente: kcal ≈ (proteinas×4) + (carboidratos×4) + (gorduras×9).
5. Classificações típicas:
   - arroz, macarrão, massa, pão, batata → carboidrato
   - frango, carne bovina/suína, peixe, ovo → proteina (+ gordura se frito/ovo)
   - feijão, lentilha → carboidrato + proteina
   - salada, legumes, verduras → vegetal + fibra
   - refrigerante, suco, café, água → bebida
   - bolo, doce, sobremesa → doce
   - hambúrguer, pizza, fritura industrial → fast_food ou industrializado
6. Alimentos comuns a reconhecer: arroz, frango, feijão, ovo, carne, massas, saladas, doces, bebidas.
7. Se a imagem não mostrar comida clara, use confianca_geral abaixo de 40 e items vazio.
8. NUNCA invente alimentos que não estejam visíveis.
9. Se houver dúvida entre dois alimentos, escolha o mais provável e reduza confianca.
10. Estime qualidade_refeicao: equilíbrio proteína/vegetais/processados.`

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

export async function analyzeWithOpenAI(
  imageBase64: string,
  imageQuality: MealAnalysisResult["imageQuality"],
): Promise<OpenAIAnalysisOutcome> {
  const { apiKey, model, configured } = getOpenAIConfig()
  if (!configured) return { kind: "not_configured" }

  const dataUrl = imageBase64.startsWith("data:")
    ? imageBase64
    : `data:image/jpeg;base64,${imageBase64}`

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
        max_tokens: 2200,
        temperature: 0.1,
      }),
      signal: AbortSignal.timeout(45000),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Timeout ou falha de rede"
    console.error("OpenAI vision fetch error", msg)
    return { kind: "api_error", message: msg }
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => "")
    console.error("OpenAI vision error", res.status, errText.slice(0, 400))
    return { kind: "api_error", message: `OpenAI retornou ${res.status}` }
  }

  const payload = await res.json()
  const content = payload?.choices?.[0]?.message?.content
  if (typeof content !== "string") {
    return { kind: "api_error", message: "Resposta vazia da OpenAI" }
  }

  let raw: OpenAiRaw
  try {
    raw = JSON.parse(content) as OpenAiRaw
  } catch {
    return { kind: "api_error", message: "JSON inválido da OpenAI" }
  }

  const confiancaGeral = Math.min(100, Math.max(0, Number(raw.confianca_geral) || 0))
  const items: DetectedFoodItem[] = (raw.items ?? [])
    .map((it) => normalizeMacroItem(it, confiancaGeral))
    .filter((it): it is DetectedFoodItem => it !== null)

  const refinedItems = refineAllItems(items)
  const validItems = filterValidItems(refinedItems, confiancaGeral)

  if (validItems.length === 0 || confiancaGeral < MIN_CONFIDENCE) {
    return {
      kind: "low_confidence",
      result: failureResult(
        imageQuality,
        confiancaGeral,
        raw.resumo ?? "Não foi possível identificar alimentos com confiança suficiente.",
        confiancaGeral < MIN_CONFIDENCE
          ? `Confiança ${confiancaGeral}% abaixo do mínimo (${MIN_CONFIDENCE}%). Recapture com melhor luz e enquadramento.`
          : "Nenhum alimento identificado com confiança suficiente.",
      ),
    }
  }

  const totais = aggregateItems(validItems)
  const niveis = buildLevels(totais)

  return {
    kind: "success",
    result: {
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
    },
  }
}
