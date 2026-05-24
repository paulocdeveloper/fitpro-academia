import type { DetectedFoodItem, MealAnalysisResult } from "@/lib/nutrition/types"
import { MIN_CONFIDENCE } from "@/lib/nutrition/types"
import { aggregateItems, buildLevels, mealQualityFromTotals, round1 } from "@/lib/nutrition/macros"

const SYSTEM_PROMPT = `Você é uma IA nutricional especializada em comida brasileira.
Analise a imagem do prato e retorne APENAS JSON válido (sem markdown) com esta estrutura:
{
  "confianca_geral": number (0-100),
  "resumo": string (1 frase descrevendo o prato),
  "qualidade_refeicao": "excelente"|"boa"|"regular"|"pobre",
  "items": [
    {
      "nome": string (nome do alimento em português),
      "categoria": "proteina"|"carboidrato"|"gordura"|"fibra"|"vegetal"|"bebida"|"industrializado"|"doce"|"fast_food",
      "categorias": string[] (todas categorias aplicáveis),
      "quantidade_g": number (estimativa em gramas),
      "confianca": number (0-100),
      "kcal": number,
      "proteinas_g": number,
      "carboidratos_g": number,
      "gorduras_g": number,
      "fibras_g": number
    }
  ]
}
Regras:
- Identifique TODOS os alimentos visíveis (múltiplos itens no prato).
- Classifique: arroz=carboidrato, frango=proteina, ovo=proteina+gordura, feijão=carboidrato+proteina, salada=fibra+vegetal.
- Estime macros realistas por porção visível (não por 100g).
- Se não houver comida clara, confianca_geral abaixo de 40.
- Nunca invente alimentos invisíveis.`

type OpenAiRaw = {
  confianca_geral?: number
  resumo?: string
  qualidade_refeicao?: MealAnalysisResult["qualidade_refeicao"]
  items?: Array<Partial<DetectedFoodItem>>
}

export async function analyzeWithOpenAI(
  imageBase64: string,
  imageQuality: MealAnalysisResult["imageQuality"],
): Promise<MealAnalysisResult | null> {
  const key = process.env.OPENAI_API_KEY?.trim()
  if (!key) return null

  const dataUrl = imageBase64.startsWith("data:")
    ? imageBase64
    : `data:image/jpeg;base64,${imageBase64}`

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_VISION_MODEL?.trim() || "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: SYSTEM_PROMPT },
            { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 1800,
      temperature: 0.2,
    }),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => "")
    console.error("OpenAI vision error", res.status, errText.slice(0, 300))
    return null
  }

  const payload = await res.json()
  const content = payload?.choices?.[0]?.message?.content
  if (typeof content !== "string") return null

  let raw: OpenAiRaw
  try {
    raw = JSON.parse(content) as OpenAiRaw
  } catch {
    return null
  }

  const confiancaGeral = Math.min(100, Math.max(0, Number(raw.confianca_geral) || 0))
  const items: DetectedFoodItem[] = (raw.items ?? [])
    .filter((it) => it.nome && (Number(it.confianca) || 0) >= 40)
    .map((it) => ({
      nome: String(it.nome),
      categoria: (it.categoria as DetectedFoodItem["categoria"]) || "carboidrato",
      categorias: Array.isArray(it.categorias)
        ? (it.categorias as DetectedFoodItem["categoria"][])
        : [it.categoria as DetectedFoodItem["categoria"]].filter(Boolean),
      quantidade_g: Math.max(10, Math.round(Number(it.quantidade_g) || 100)),
      confianca: Math.min(100, Math.max(0, Number(it.confianca) || confiancaGeral)),
      kcal: Math.max(0, Math.round(Number(it.kcal) || 0)),
      proteinas_g: round1(Number(it.proteinas_g) || 0),
      carboidratos_g: round1(Number(it.carboidratos_g) || 0),
      gorduras_g: round1(Number(it.gorduras_g) || 0),
      fibras_g: round1(Number(it.fibras_g) || 0),
    }))

  if (items.length === 0 || confiancaGeral < MIN_CONFIDENCE) {
    return {
      ok: false,
      confianca_geral: confiancaGeral,
      qualidade_refeicao: "regular",
      resumo: raw.resumo ?? "Não foi possível identificar alimentos com confiança suficiente.",
      items: [],
      totais: { kcal: 0, proteinas_g: 0, carboidratos_g: 0, gorduras_g: 0, fibras_g: 0 },
      niveis: { proteina: "baixa", carboidrato: "baixa", gordura: "baixa" },
      imageQuality,
      engine: "openai",
      error: "Confiança insuficiente ou nenhum alimento detectado.",
    }
  }

  const totais = aggregateItems(items)
  const niveis = buildLevels(totais)

  return {
    ok: true,
    confianca_geral: confiancaGeral,
    qualidade_refeicao: raw.qualidade_refeicao ?? mealQualityFromTotals(totais),
    resumo: raw.resumo ?? `Prato com ${items.length} item(ns) identificado(s).`,
    items,
    totais,
    niveis,
    imageQuality,
    engine: "openai",
  }
}
