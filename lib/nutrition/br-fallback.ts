import type { DetectedFoodItem, MealAnalysisResult } from "@/lib/nutrition/types"
import { aggregateItems, buildLevels, mealQualityFromTotals } from "@/lib/nutrition/macros"
import { refineAllItems } from "@/lib/nutrition/taco-sanity"
import {
  BR_PLATE_TEMPLATES,
  brFoodById,
  brFoodToItem,
  findBrFoodByText,
  type BrFoodRef,
} from "@/lib/nutrition/br-foods-db"
import { analyzeWithHeuristic } from "@/lib/nutrition/heuristic-vision"

function plateFromTemplate(
  templateId: string,
  imageQuality: MealAnalysisResult["imageQuality"],
  confiancaBase: number,
): MealAnalysisResult {
  const tpl = BR_PLATE_TEMPLATES.find((p) => p.id === templateId) ?? BR_PLATE_TEMPLATES[0]
  const items: DetectedFoodItem[] = []
  for (const f of tpl.foods) {
    const ref = brFoodById(f.id)
    if (!ref) continue
    items.push(brFoodToItem(ref, f.grams, confiancaBase))
  }
  const refined = refineAllItems(items)
  const totais = aggregateItems(refined)
  const confianca_geral = Math.min(72, Math.max(48, confiancaBase + Math.floor(imageQuality.score / 8)))
  return {
    ok: true,
    confianca_geral,
    qualidade_refeicao: mealQualityFromTotals(totais),
    resumo: tpl.label,
    items: refined,
    totais,
    niveis: buildLevels(totais),
    imageQuality,
    engine: "heuristic",
    warning: "Estimativa local (banco BR). Revise porções se necessário.",
  }
}

function itemsFromNames(names: string[], confianca: number): DetectedFoodItem[] {
  const items: DetectedFoodItem[] = []
  const seen = new Set<string>()
  for (const name of names) {
    const ref = findBrFoodByText(name)
    if (!ref || seen.has(ref.id)) continue
    seen.add(ref.id)
    items.push(brFoodToItem(ref, ref.porcao_padrao_g, confianca))
  }
  return refineAllItems(items)
}

function mergePartialItems(
  partial: DetectedFoodItem[],
  imageQuality: MealAnalysisResult["imageQuality"],
): MealAnalysisResult {
  const seenIds = new Set(
    partial.map((i) => findBrFoodByText(i.nome)?.id).filter(Boolean),
  )
  const staples = ["arroz", "feijão", "frango", "salada"]
  const extra = itemsFromNames(
    staples.filter((n) => {
      const id = findBrFoodByText(n)?.id
      return id && !seenIds.has(id)
    }),
    52,
  )
  const merged = refineAllItems([...partial, ...extra].slice(0, 6))
  const totais = aggregateItems(merged)
  return {
    ok: true,
    confianca_geral: Math.round(merged.reduce((s, i) => s + i.confianca, 0) / merged.length),
    qualidade_refeicao: mealQualityFromTotals(totais),
    resumo: `Prato estimado: ${merged.map((i) => i.nome).join(", ")}.`,
    items: merged,
    totais,
    niveis: buildLevels(totais),
    imageQuality,
    engine: "heuristic",
    warning: "Análise parcial — complementada com referência BR.",
  }
}

/**
 * Fallback inteligente BR — nunca retorna vazio.
 * Usa: itens parciais da Vision, heurística de cor (pixels), ou prato típico BR.
 */
export function analyzeWithBrFallback(
  imageQuality: MealAnalysisResult["imageQuality"],
  options?: {
    partialItems?: DetectedFoodItem[]
    pixels?: Uint8ClampedArray
    hintText?: string
    templateId?: string
  },
): MealAnalysisResult {
  const confBase = Math.min(68, Math.max(50, 45 + Math.floor(imageQuality.score / 5)))

  if (options?.partialItems?.length) {
    return mergePartialItems(options.partialItems, imageQuality)
  }

  if (options?.hintText) {
    const fromHint = itemsFromNames([options.hintText], confBase)
    if (fromHint.length > 0) {
      const totais = aggregateItems(fromHint)
      return {
        ok: true,
        confianca_geral: confBase,
        qualidade_refeicao: mealQualityFromTotals(totais),
        resumo: `Detectado por referência BR: ${fromHint.map((i) => i.nome).join(", ")}.`,
        items: fromHint,
        totais,
        niveis: buildLevels(totais),
        imageQuality,
        engine: "heuristic",
        warning: "Estimativa local a partir de dica textual.",
      }
    }
  }

  if (options?.pixels?.length) {
    const heuristic = analyzeWithHeuristic(options.pixels, imageQuality)
    if (heuristic.items.length > 0) {
      const named = heuristic.items
        .map((it) => {
          const ref = matchHeuristicName(it.nome)
          return ref ? brFoodToItem(ref, ref.porcao_padrao_g, Math.max(52, it.confianca)) : it
        })
        .filter((i) => i.kcal > 0)
      if (named.length > 0) {
        const refined = refineAllItems(named)
        const totais = aggregateItems(refined)
        return {
          ok: true,
          confianca_geral: Math.max(52, heuristic.confianca_geral),
          qualidade_refeicao: mealQualityFromTotals(totais),
          resumo: `Prato estimado (análise visual local): ${refined.map((i) => i.nome).join(", ")}.`,
          items: refined,
          totais,
          niveis: buildLevels(totais),
          imageQuality,
          engine: "heuristic",
          warning: "Modo offline — estimativa por cores e banco BR.",
        }
      }
    }
  }

  return plateFromTemplate(options?.templateId ?? "prato_feito", imageQuality, confBase)
}

function matchHeuristicName(nome: string): BrFoodRef | null {
  if (/prote[ií]na|carne|frango/i.test(nome)) return brFoodById("frango") ?? null
  if (/carboidrato|arroz|massa|p[aã]o/i.test(nome)) return brFoodById("arroz") ?? null
  if (/vegetal|salada/i.test(nome)) return brFoodById("salada") ?? null
  return null
}
