import type { DetectedFoodItem, MacroLevel, MealAnalysisResult } from "@/lib/nutrition/types"

export function macroLevel(value: number, low: number, high: number): MacroLevel {
  if (value >= high) return "alta"
  if (value <= low) return "baixa"
  return "media"
}

export function mealQualityFromTotals(t: MealAnalysisResult["totais"]): MealAnalysisResult["qualidade_refeicao"] {
  const proteinRatio = t.proteinas_g / Math.max(t.kcal / 100, 1)
  const vegScore = t.fibras_g >= 8 ? 1 : 0
  const balance = t.proteinas_g > 15 && t.carboidratos_g < 80 && t.gorduras_g < 35 ? 1 : 0
  const score = proteinRatio * 10 + vegScore * 2 + balance * 2
  if (score >= 8) return "excelente"
  if (score >= 5) return "boa"
  if (score >= 3) return "regular"
  return "pobre"
}

export function aggregateItems(items: DetectedFoodItem[]): MealAnalysisResult["totais"] {
  return items.reduce(
    (acc, item) => ({
      kcal: acc.kcal + item.kcal,
      proteinas_g: acc.proteinas_g + item.proteinas_g,
      carboidratos_g: acc.carboidratos_g + item.carboidratos_g,
      gorduras_g: acc.gorduras_g + item.gorduras_g,
      fibras_g: acc.fibras_g + item.fibras_g,
    }),
    { kcal: 0, proteinas_g: 0, carboidratos_g: 0, gorduras_g: 0, fibras_g: 0 },
  )
}

export function buildLevels(totais: MealAnalysisResult["totais"]) {
  return {
    proteina: macroLevel(totais.proteinas_g, 12, 28),
    carboidrato: macroLevel(totais.carboidratos_g, 25, 55),
    gordura: macroLevel(totais.gorduras_g, 8, 22),
  }
}

export function round1(n: number) {
  return Math.round(n * 10) / 10
}
