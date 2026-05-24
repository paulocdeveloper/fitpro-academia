import type { DetectedFoodItem } from "@/lib/nutrition/types"
import { round1 } from "@/lib/nutrition/macros"
import { estimateKcal } from "@/lib/nutrition/validate-macros"

/** Referência TACO por 100g — usado para calibrar estimativas da Vision. */
const TACO_PER_100G: Array<{
  pattern: RegExp
  p: number
  c: number
  g: number
  kcal: number
}> = [
  { pattern: /arroz/i, p: 2.5, c: 28, g: 0.2, kcal: 128 },
  { pattern: /frango|galinha|peito/i, p: 31, c: 0, g: 3.6, kcal: 165 },
  { pattern: /feij[aã]o/i, p: 4.8, c: 14, g: 0.5, kcal: 77 },
  { pattern: /ovo/i, p: 13, c: 0.6, g: 11, kcal: 155 },
  { pattern: /carne|bovin|boi|porco|su[ií]n|peixe|salm[aã]o|til[aá]pia/i, p: 26, c: 0, g: 8, kcal: 180 },
  { pattern: /macarr[aã]o|massa|espaguete|penne/i, p: 5, c: 25, g: 1, kcal: 131 },
  { pattern: /salada|alface|tomate|verdura|legume|br[oó]colis/i, p: 1.5, c: 3, g: 0.2, kcal: 20 },
  { pattern: /batata/i, p: 2, c: 17, g: 0.1, kcal: 77 },
  { pattern: /p[aã]o|torrada/i, p: 8, c: 49, g: 3, kcal: 270 },
  { pattern: /refrigerante|suco|bebida|caf[eé]|[aá]gua/i, p: 0, c: 10, g: 0, kcal: 40 },
  { pattern: /doce|bolo|sobremesa|chocolate/i, p: 3, c: 45, g: 12, kcal: 300 },
]

function scalePer100g(ref: (typeof TACO_PER_100G)[0], grams: number) {
  const m = grams / 100
  return {
    proteinas_g: round1(ref.p * m),
    carboidratos_g: round1(ref.c * m),
    gorduras_g: round1(ref.g * m),
    kcal: Math.round(ref.kcal * m),
  }
}

/** Ajusta macros quando a Vision diverge muito da referência TACO (blend 65% IA + 35% TACO). */
export function refineWithTacoReference(item: DetectedFoodItem): DetectedFoodItem {
  const ref = TACO_PER_100G.find((t) => t.pattern.test(item.nome))
  if (!ref) return item

  const taco = scalePer100g(ref, item.quantidade_g)
  const aiKcal = estimateKcal(item.proteinas_g, item.carboidratos_g, item.gorduras_g)
  const tacoKcal = taco.kcal
  if (aiKcal === 0 || tacoKcal === 0) return item

  const ratio = aiKcal / tacoKcal
  if (ratio >= 0.65 && ratio <= 1.5) return item

  const blend = (ai: number, refVal: number) => round1(ai * 0.65 + refVal * 0.35)

  const proteinas_g = blend(item.proteinas_g, taco.proteinas_g)
  const carboidratos_g = blend(item.carboidratos_g, taco.carboidratos_g)
  const gorduras_g = blend(item.gorduras_g, taco.gorduras_g)
  const kcal = estimateKcal(proteinas_g, carboidratos_g, gorduras_g)

  return { ...item, proteinas_g, carboidratos_g, gorduras_g, kcal }
}

export function refineAllItems(items: DetectedFoodItem[]): DetectedFoodItem[] {
  return items.map(refineWithTacoReference)
}
