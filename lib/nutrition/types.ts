export type FoodCategory =
  | "proteina"
  | "carboidrato"
  | "gordura"
  | "fibra"
  | "vegetal"
  | "bebida"
  | "industrializado"
  | "doce"
  | "fast_food"

export type MacroLevel = "baixa" | "media" | "alta"

export type DetectedFoodItem = {
  nome: string
  categoria: FoodCategory
  categorias: FoodCategory[]
  quantidade_g: number
  confianca: number
  kcal: number
  proteinas_g: number
  carboidratos_g: number
  gorduras_g: number
  fibras_g: number
}

export type MealAnalysisResult = {
  ok: boolean
  confianca_geral: number
  qualidade_refeicao: "excelente" | "boa" | "regular" | "pobre"
  resumo: string
  items: DetectedFoodItem[]
  totais: {
    kcal: number
    proteinas_g: number
    carboidratos_g: number
    gorduras_g: number
    fibras_g: number
  }
  niveis: {
    proteina: MacroLevel
    carboidrato: MacroLevel
    gordura: MacroLevel
  }
  imageQuality: {
    ok: boolean
    score: number
    issues: string[]
  }
  engine: "openai" | "heuristic"
  model?: string
  error?: string
  /** Aviso não bloqueante (ex.: confiança moderada). */
  warning?: string
}

/** Confiança mínima do prato — abaixo disso ainda pode retornar itens com aviso. */
export const MIN_CONFIDENCE = 42
export const MIN_ITEM_CONFIDENCE = 38
