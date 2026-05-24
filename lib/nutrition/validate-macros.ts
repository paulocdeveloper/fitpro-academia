import type { DetectedFoodItem, FoodCategory } from "@/lib/nutrition/types"
import { MIN_CONFIDENCE, MIN_ITEM_CONFIDENCE } from "@/lib/nutrition/types"
import { round1 } from "@/lib/nutrition/macros"

const VALID_CATEGORIES = new Set<FoodCategory>([
  "proteina",
  "carboidrato",
  "gordura",
  "fibra",
  "vegetal",
  "bebida",
  "industrializado",
  "doce",
  "fast_food",
])

/** kcal ≈ 4P + 4C + 9G (Atwater) */
export function estimateKcal(p: number, c: number, g: number) {
  return Math.round(p * 4 + c * 4 + g * 9)
}

export function normalizeMacroItem(raw: Partial<DetectedFoodItem>, fallbackConfidence: number): DetectedFoodItem | null {
  const nome = typeof raw.nome === "string" ? raw.nome.trim() : ""
  if (!nome || nome.length < 2) return null

  const confianca = Math.min(100, Math.max(0, Number(raw.confianca) || fallbackConfidence))
  if (confianca < MIN_ITEM_CONFIDENCE) return null

  let categoria = (raw.categoria as FoodCategory) || "carboidrato"
  if (!VALID_CATEGORIES.has(categoria)) categoria = "carboidrato"

  let categorias = Array.isArray(raw.categorias)
    ? (raw.categorias as FoodCategory[]).filter((c) => VALID_CATEGORIES.has(c))
    : [categoria]
  if (categorias.length === 0) categorias = [categoria]
  if (!categorias.includes(categoria)) categorias.unshift(categoria)

  const quantidade_g = Math.max(10, Math.min(800, Math.round(Number(raw.quantidade_g) || 100)))
  let proteinas_g = round1(Math.max(0, Number(raw.proteinas_g) || 0))
  let carboidratos_g = round1(Math.max(0, Number(raw.carboidratos_g) || 0))
  let gorduras_g = round1(Math.max(0, Number(raw.gorduras_g) || 0))
  let fibras_g = round1(Math.max(0, Number(raw.fibras_g) || 0))

  let kcal = Math.max(0, Math.round(Number(raw.kcal) || 0))
  const expected = estimateKcal(proteinas_g, carboidratos_g, gorduras_g)

  if (kcal === 0 && expected > 0) {
    kcal = expected
  } else if (kcal > 0 && expected > 0) {
    const ratio = kcal / expected
    if (ratio < 0.55 || ratio > 1.75) {
      kcal = Math.round((kcal + expected) / 2)
    }
  }

  if (kcal < 5 && proteinas_g + carboidratos_g + gorduras_g < 1) return null

  return {
    nome,
    categoria,
    categorias,
    quantidade_g,
    confianca,
    kcal,
    proteinas_g,
    carboidratos_g,
    gorduras_g,
    fibras_g,
  }
}

export function filterValidItems(items: DetectedFoodItem[], confiancaGeral: number): DetectedFoodItem[] {
  if (confiancaGeral < MIN_CONFIDENCE) return []
  return items.filter((it) => it.confianca >= MIN_ITEM_CONFIDENCE)
}
