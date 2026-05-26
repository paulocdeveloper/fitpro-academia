import type { LucideIcon } from "lucide-react"
import { Apple, Coffee, Moon, Sun } from "lucide-react"

export type Alimento = {
  item: string
  qtd: string
  kcal: number
  proteinas_g: number
  carboidratos_g: number
  gorduras_g: number
}

export type Refeicao = {
  id: string
  tipo: string
  horario: string
  icon: LucideIcon
  alimentos: Alimento[]
}

export type DietaPlano = {
  aluno: string
  objetivo: string
  proteinas: number
  carbos: number
  gorduras: number
  refeicoes: Refeicao[]
}

export const MACRO_COLORS = {
  proteinas: "oklch(0.7 0.22 145)",
  carbos: "oklch(0.75 0.18 80)",
  gorduras: "oklch(0.65 0.2 200)",
} as const

export function sumConsumo(refeicoes: Refeicao[]) {
  return refeicoes.reduce(
    (acc, r) => {
      for (const a of r.alimentos) {
        acc.kcal += a.kcal
        acc.proteinas += a.proteinas_g
        acc.carbos += a.carboidratos_g
        acc.gorduras += a.gorduras_g
      }
      return acc
    },
    { kcal: 0, proteinas: 0, carbos: 0, gorduras: 0 },
  )
}

/** Plano inicial para usuário fitness (sem dados de academia). */
export function createFitnessDieta(displayName: string): DietaPlano {
  return {
    aluno: displayName || "Meu plano",
    objetivo: "Acompanhar refeições e macros",
    proteinas: 150,
    carbos: 200,
    gorduras: 65,
    refeicoes: [
      { id: "ref-cafe", tipo: "Café da Manhã", horario: "07:00", icon: Coffee, alimentos: [] },
      { id: "ref-almoco", tipo: "Almoço", horario: "12:00", icon: Sun, alimentos: [] },
      { id: "ref-lanche", tipo: "Lanche", horario: "15:30", icon: Apple, alimentos: [] },
      { id: "ref-jantar", tipo: "Jantar", horario: "19:30", icon: Moon, alimentos: [] },
    ],
  }
}

/** Demo staff / visualização rica. */
export function createDemoDieta(): DietaPlano {
  const map = (items: Array<{ item: string; qtd: string; kcal: number }>) =>
    items.map((a) => ({ ...a, proteinas_g: 0, carboidratos_g: 0, gorduras_g: 0 }))

  return {
    aluno: "Carlos Silva",
    objetivo: "Hipertrofia",
    proteinas: 180,
    carbos: 380,
    gorduras: 90,
    refeicoes: [
      {
        id: "ref-cafe",
        tipo: "Café da Manhã",
        horario: "07:00",
        icon: Coffee,
        alimentos: map([
          { item: "Ovos mexidos (3 unidades)", qtd: "180g", kcal: 210 },
          { item: "Pão integral", qtd: "60g", kcal: 155 },
          { item: "Banana", qtd: "120g", kcal: 108 },
          { item: "Whey Protein", qtd: "30g", kcal: 120 },
        ]),
      },
      {
        id: "ref-almoco",
        tipo: "Almoço",
        horario: "12:00",
        icon: Sun,
        alimentos: map([
          { item: "Frango grelhado", qtd: "200g", kcal: 330 },
          { item: "Arroz integral", qtd: "150g", kcal: 210 },
          { item: "Feijão carioca", qtd: "100g", kcal: 130 },
          { item: "Salada verde", qtd: "100g", kcal: 30 },
          { item: "Azeite de oliva", qtd: "10ml", kcal: 90 },
        ]),
      },
      {
        id: "ref-lanche",
        tipo: "Lanche",
        horario: "15:30",
        icon: Apple,
        alimentos: map([
          { item: "Batata doce cozida", qtd: "150g", kcal: 162 },
          { item: "Peito de frango", qtd: "100g", kcal: 165 },
          { item: "Castanhas", qtd: "30g", kcal: 196 },
        ]),
      },
      {
        id: "ref-jantar",
        tipo: "Jantar",
        horario: "19:30",
        icon: Moon,
        alimentos: map([
          { item: "Salmão grelhado", qtd: "200g", kcal: 376 },
          { item: "Brócolis no vapor", qtd: "150g", kcal: 51 },
          { item: "Batata doce", qtd: "150g", kcal: 162 },
          { item: "Azeite de oliva", qtd: "10ml", kcal: 90 },
        ]),
      },
    ],
  }
}
