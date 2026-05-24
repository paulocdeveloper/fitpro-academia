import type { DetectedFoodItem, FoodCategory, MealAnalysisResult } from "@/lib/nutrition/types"
import { MIN_CONFIDENCE } from "@/lib/nutrition/types"
import { aggregateItems, buildLevels, mealQualityFromTotals } from "@/lib/nutrition/macros"

type ColorProfile = {
  green: number
  brown: number
  white: number
  red: number
  yellow: number
  dark: number
}

const CATEGORY_TEMPLATES: Record<
  FoodCategory,
  { nome: string; kcal: number; p: number; c: number; g: number; f: number; baseConf: number }
> = {
  proteina: { nome: "Proteína (carne/frango/peixe)", kcal: 220, p: 32, c: 2, g: 9, f: 0, baseConf: 62 },
  carboidrato: { nome: "Carboidrato (arroz/massa/pão)", kcal: 195, p: 4, c: 42, g: 1, f: 2, baseConf: 60 },
  gordura: { nome: "Gordura (óleo/molho)", kcal: 135, p: 0, c: 0, g: 15, f: 0, baseConf: 55 },
  fibra: { nome: "Fibras (vegetais/legumes)", kcal: 45, p: 2, c: 8, g: 0.5, f: 4, baseConf: 58 },
  vegetal: { nome: "Salada / vegetais", kcal: 35, p: 2, c: 6, g: 0.3, f: 3, baseConf: 65 },
  bebida: { nome: "Bebida", kcal: 80, p: 0, c: 18, g: 0, f: 0, baseConf: 50 },
  industrializado: { nome: "Alimento industrializado", kcal: 280, p: 6, c: 32, g: 14, f: 2, baseConf: 52 },
  doce: { nome: "Doce / sobremesa", kcal: 250, p: 3, c: 38, g: 10, f: 1, baseConf: 54 },
  fast_food: { nome: "Fast food", kcal: 420, p: 18, c: 38, g: 22, f: 3, baseConf: 56 },
}

function analyzeColorProfile(pixels: Uint8ClampedArray): ColorProfile {
  const profile: ColorProfile = { green: 0, brown: 0, white: 0, red: 0, yellow: 0, dark: 0 }
  const step = 4
  let count = 0
  for (let i = 0; i < pixels.length; i += 4 * step) {
    const r = pixels[i]
    const g = pixels[i + 1]
    const b = pixels[i + 2]
    const lum = (r + g + b) / 3
    count++
    if (lum < 40) profile.dark++
    else if (g > r + 18 && g > b + 12 && g > 70) profile.green++
    else if (r > 140 && g > 100 && b < 90 && r > b + 20) profile.brown++
    else if (r > 150 && g < 100 && b < 90) profile.red++
    else if (r > 180 && g > 150 && b < 120) profile.yellow++
    else if (lum > 185 && Math.abs(r - g) < 30 && Math.abs(g - b) < 30) profile.white++
  }
  const total = Math.max(count, 1)
  return {
    green: profile.green / total,
    brown: profile.brown / total,
    white: profile.white / total,
    red: profile.red / total,
    yellow: profile.yellow / total,
    dark: profile.dark / total,
  }
}

function makeItem(
  t: (typeof CATEGORY_TEMPLATES)[FoodCategory],
  cat: FoodCategory,
  cats: FoodCategory[],
  weight: number,
  confBoost: number,
): DetectedFoodItem {
  const confianca = Math.min(78, Math.max(45, Math.round(t.baseConf + weight * 40 + confBoost)))
  return {
    nome: t.nome,
    categoria: cat,
    categorias: cats,
    quantidade_g: 150,
    confianca,
    kcal: t.kcal,
    proteinas_g: t.p,
    carboidratos_g: t.c,
    gorduras_g: t.g,
    fibras_g: t.f,
  }
}

function itemsFromProfile(profile: ColorProfile, qualityScore: number): DetectedFoodItem[] {
  const items: DetectedFoodItem[] = []
  const confBoost = Math.min(15, Math.floor(qualityScore / 10))
  if (profile.green > 0.06) {
    const t = CATEGORY_TEMPLATES.vegetal
    items.push(makeItem(t, "vegetal", ["vegetal", "fibra"], profile.green, confBoost + 8))
  }
  if (profile.white > 0.12 || profile.yellow > 0.08) {
    const t = CATEGORY_TEMPLATES.carboidrato
    items.push(makeItem(t, "carboidrato", ["carboidrato"], profile.white + profile.yellow, confBoost))
  }
  if (profile.brown > 0.08 || profile.red > 0.06) {
    const t = CATEGORY_TEMPLATES.proteina
    items.push(makeItem(t, "proteina", ["proteina"], profile.brown + profile.red, confBoost + 5))
  }
  if (profile.dark > 0.35 && items.length === 0) return []
  return items.slice(0, 4)
}

export function analyzeWithHeuristic(
  pixels: Uint8ClampedArray,
  imageQuality: MealAnalysisResult["imageQuality"],
): MealAnalysisResult {
  const profile = analyzeColorProfile(pixels)
  const items = itemsFromProfile(profile, imageQuality.score)

  if (items.length === 0 || !imageQuality.ok) {
    return {
      ok: false,
      confianca_geral: Math.max(20, imageQuality.score - 20),
      qualidade_refeicao: "regular",
      resumo: "Não foi possível analisar o prato. Melhore a iluminação e o enquadramento.",
      items: [],
      totais: { kcal: 0, proteinas_g: 0, carboidratos_g: 0, gorduras_g: 0, fibras_g: 0 },
      niveis: { proteina: "baixa", carboidrato: "baixa", gordura: "baixa" },
      imageQuality,
      engine: "heuristic",
      error: imageQuality.issues[0] ?? "Imagem inadequada para análise.",
    }
  }

  const confiancaGeral = Math.round(items.reduce((s, i) => s + i.confianca, 0) / items.length)
  const totais = aggregateItems(items)

  if (confiancaGeral < MIN_CONFIDENCE) {
    return {
      ok: false,
      confianca_geral: confiancaGeral,
      qualidade_refeicao: "regular",
      resumo: "Confiança baixa na detecção visual.",
      items,
      totais,
      niveis: buildLevels(totais),
      imageQuality,
      engine: "heuristic",
      error: "Confiança abaixo do mínimo. Configure OPENAI_API_KEY para análise avançada ou recapture.",
    }
  }

  return {
    ok: true,
    confianca_geral: confiancaGeral,
    qualidade_refeicao: mealQualityFromTotals(totais),
    resumo: `Prato estimado: ${items.map((i) => i.nome.split("(")[0].trim()).join(", ")}.`,
    items,
    totais,
    niveis: buildLevels(totais),
    imageQuality,
    engine: "heuristic",
  }
}
