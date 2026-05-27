import type { DetectedFoodItem, FoodCategory } from "@/lib/nutrition/types"
import { estimateKcal } from "@/lib/nutrition/validate-macros"
import { round1 } from "@/lib/nutrition/macros"

/** Alimento BR prioritário — macros por 100g (referência TACO aproximada). */
export type BrFoodRef = {
  id: string
  nome: string
  categoria: FoodCategory
  categorias: FoodCategory[]
  kcal_100: number
  p_100: number
  c_100: number
  g_100: number
  f_100: number
  porcao_padrao_g: number
  aliases: string[]
}

export const BR_FOODS: BrFoodRef[] = [
  {
    id: "arroz",
    nome: "Arroz branco cozido",
    categoria: "carboidrato",
    categorias: ["carboidrato"],
    kcal_100: 128,
    p_100: 2.5,
    c_100: 28,
    g_100: 0.2,
    f_100: 0.4,
    porcao_padrao_g: 150,
    aliases: ["arroz", "rice", "branco"],
  },
  {
    id: "feijao",
    nome: "Feijão carioca cozido",
    categoria: "carboidrato",
    categorias: ["carboidrato", "proteina"],
    kcal_100: 77,
    p_100: 4.8,
    c_100: 14,
    g_100: 0.5,
    f_100: 4,
    porcao_padrao_g: 100,
    aliases: ["feijao", "feijão", "preto", "carioca"],
  },
  {
    id: "frango",
    nome: "Peito de frango grelhado",
    categoria: "proteina",
    categorias: ["proteina"],
    kcal_100: 165,
    p_100: 31,
    c_100: 0,
    g_100: 3.6,
    f_100: 0,
    porcao_padrao_g: 120,
    aliases: ["frango", "galinha", "peito", "grelhado"],
  },
  {
    id: "carne",
    nome: "Carne bovina grelhada",
    categoria: "proteina",
    categorias: ["proteina"],
    kcal_100: 250,
    p_100: 26,
    c_100: 0,
    g_100: 16,
    f_100: 0,
    porcao_padrao_g: 100,
    aliases: ["carne", "bovina", "boi", "patinho", "moida", "moída", "bife"],
  },
  {
    id: "ovo",
    nome: "Ovo cozido",
    categoria: "proteina",
    categorias: ["proteina", "gordura"],
    kcal_100: 155,
    p_100: 13,
    c_100: 1.1,
    g_100: 11,
    f_100: 0,
    porcao_padrao_g: 50,
    aliases: ["ovo", "ovos", "omelete"],
  },
  {
    id: "pao",
    nome: "Pão francês",
    categoria: "carboidrato",
    categorias: ["carboidrato"],
    kcal_100: 270,
    p_100: 8,
    c_100: 49,
    g_100: 3,
    f_100: 2,
    porcao_padrao_g: 50,
    aliases: ["pao", "pão", "frances", "torrada"],
  },
  {
    id: "macarrao",
    nome: "Macarrão cozido",
    categoria: "carboidrato",
    categorias: ["carboidrato"],
    kcal_100: 131,
    p_100: 5,
    c_100: 25,
    g_100: 1,
    f_100: 1.5,
    porcao_padrao_g: 180,
    aliases: ["macarrao", "macarrão", "massa", "espaguete", "penne"],
  },
  {
    id: "batata",
    nome: "Batata cozida",
    categoria: "carboidrato",
    categorias: ["carboidrato"],
    kcal_100: 77,
    p_100: 2,
    c_100: 17,
    g_100: 0.1,
    f_100: 1.5,
    porcao_padrao_g: 150,
    aliases: ["batata", "mandioca", "aipim"],
  },
  {
    id: "salada",
    nome: "Salada verde",
    categoria: "vegetal",
    categorias: ["vegetal", "fibra"],
    kcal_100: 20,
    p_100: 1.5,
    c_100: 3,
    g_100: 0.2,
    f_100: 2,
    porcao_padrao_g: 80,
    aliases: ["salada", "alface", "tomate", "verdura", "legumes"],
  },
  {
    id: "banana",
    nome: "Banana",
    categoria: "carboidrato",
    categorias: ["carboidrato", "fibra"],
    kcal_100: 89,
    p_100: 1.1,
    c_100: 23,
    g_100: 0.3,
    f_100: 2,
    porcao_padrao_g: 100,
    aliases: ["banana", "maca", "maçã", "fruta"],
  },
  {
    id: "refrigerante",
    nome: "Refrigerante",
    categoria: "bebida",
    categorias: ["bebida"],
    kcal_100: 42,
    p_100: 0,
    c_100: 10.6,
    g_100: 0,
    f_100: 0,
    porcao_padrao_g: 350,
    aliases: ["refrigerante", "coca", "guarana", "suco"],
  },
  {
    id: "cafe",
    nome: "Café com leite",
    categoria: "bebida",
    categorias: ["bebida"],
    kcal_100: 45,
    p_100: 2,
    c_100: 4,
    g_100: 2,
    f_100: 0,
    porcao_padrao_g: 200,
    aliases: ["cafe", "café", "cappuccino"],
  },
  {
    id: "whey",
    nome: "Whey protein",
    categoria: "proteina",
    categorias: ["proteina", "industrializado"],
    kcal_100: 400,
    p_100: 80,
    c_100: 8,
    g_100: 5,
    f_100: 0,
    porcao_padrao_g: 30,
    aliases: ["whey", "protein", "shake"],
  },
  {
    id: "pizza",
    nome: "Pizza (fatia)",
    categoria: "fast_food",
    categorias: ["fast_food", "carboidrato", "gordura"],
    kcal_100: 266,
    p_100: 11,
    c_100: 33,
    g_100: 10,
    f_100: 2,
    porcao_padrao_g: 120,
    aliases: ["pizza"],
  },
  {
    id: "hamburguer",
    nome: "Hambúrguer",
    categoria: "fast_food",
    categorias: ["fast_food", "proteina"],
    kcal_100: 295,
    p_100: 17,
    c_100: 24,
    g_100: 14,
    f_100: 1,
    porcao_padrao_g: 180,
    aliases: ["hamburguer", "hambúrguer", "burger", "x-burger"],
  },
  {
    id: "acai",
    nome: "Açaí na tigela",
    categoria: "doce",
    categorias: ["doce", "carboidrato"],
    kcal_100: 110,
    p_100: 1.5,
    c_100: 18,
    g_100: 4,
    f_100: 3,
    porcao_padrao_g: 300,
    aliases: ["acai", "açaí"],
  },
  {
    id: "tapioca",
    nome: "Tapioca",
    categoria: "carboidrato",
    categorias: ["carboidrato"],
    kcal_100: 220,
    p_100: 1,
    c_100: 52,
    g_100: 1,
    f_100: 1,
    porcao_padrao_g: 80,
    aliases: ["tapioca", "beiju"],
  },
]

export function brFoodToItem(ref: BrFoodRef, grams: number, confianca: number): DetectedFoodItem {
  const m = grams / 100
  const proteinas_g = round1(ref.p_100 * m)
  const carboidratos_g = round1(ref.c_100 * m)
  const gorduras_g = round1(ref.g_100 * m)
  const fibras_g = round1(ref.f_100 * m)
  const kcal = estimateKcal(proteinas_g, carboidratos_g, gorduras_g) || Math.round(ref.kcal_100 * m)
  return {
    nome: ref.nome,
    categoria: ref.categoria,
    categorias: ref.categorias,
    quantidade_g: Math.round(grams),
    confianca,
    kcal,
    proteinas_g,
    carboidratos_g,
    gorduras_g,
    fibras_g,
  }
}

export function findBrFoodByText(text: string): BrFoodRef | null {
  const t = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
  for (const food of BR_FOODS) {
    if (food.aliases.some((a) => t.includes(a.normalize("NFD").replace(/\p{M}/gu, "")))) {
      return food
    }
    if (t.includes(food.id)) return food
  }
  return null
}

/** Pratos compostos típicos BR quando a Vision falha. */
export const BR_PLATE_TEMPLATES: { id: string; label: string; foods: Array<{ id: string; grams: number }> }[] = [
  {
    id: "prato_feito",
    label: "Prato feito brasileiro (arroz, feijão, frango e salada)",
    foods: [
      { id: "arroz", grams: 150 },
      { id: "feijao", grams: 100 },
      { id: "frango", grams: 120 },
      { id: "salada", grams: 70 },
    ],
  },
  {
    id: "cafe_manha",
    label: "Café da manhã típico",
    foods: [
      { id: "pao", grams: 50 },
      { id: "ovo", grams: 100 },
      { id: "banana", grams: 100 },
      { id: "cafe", grams: 200 },
    ],
  },
  {
    id: "lanche_fit",
    label: "Lanche proteico",
    foods: [
      { id: "whey", grams: 30 },
      { id: "banana", grams: 100 },
    ],
  },
  {
    id: "massa",
    label: "Macarrão com carne",
    foods: [
      { id: "macarrao", grams: 200 },
      { id: "carne", grams: 100 },
      { id: "salada", grams: 60 },
    ],
  },
]

export function brFoodById(id: string): BrFoodRef | undefined {
  return BR_FOODS.find((f) => f.id === id)
}
