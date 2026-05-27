import type { DietaPlano, Refeicao } from "@/lib/nutrition/diet-types"
import { Apple, Coffee, Moon, Sun } from "lucide-react"
import type { PerfilTreinoInteligente } from "@/lib/treino-inteligente/generator"
import { brFoodToItem, brFoodById } from "@/lib/nutrition/br-foods-db"

function tdee(perfil: PerfilTreinoInteligente): number {
  const peso = perfil.peso_kg ?? 70
  const altura = perfil.altura_cm ?? 170
  const idade = perfil.idade ?? 30
  const sexo = perfil.sexo
  const bmr =
    sexo === "feminino"
      ? 10 * peso + 6.25 * altura - 5 * idade - 161
      : 10 * peso + 6.25 * altura - 5 * idade + 5
  const freq = perfil.frequencia_semanal ?? 3
  const factor = freq <= 2 ? 1.375 : freq <= 4 ? 1.55 : 1.725
  return Math.round(bmr * factor)
}

function macroTargets(perfil: PerfilTreinoInteligente) {
  const kcalBase = tdee(perfil)
  const obj = (perfil.objetivo ?? "Saúde").toLowerCase()

  if (obj.includes("hipertrofia") || obj.includes("força") || obj.includes("forca")) {
    const kcal = Math.round(kcalBase * 1.12)
    const proteinas = Math.round((perfil.peso_kg ?? 70) * 2)
    const gorduras = Math.round((perfil.peso_kg ?? 70) * 0.9)
    const carbos = Math.round((kcal - proteinas * 4 - gorduras * 9) / 4)
    return { kcal, proteinas, carbos, gorduras, objetivoLabel: "Hipertrofia — superávit calórico e proteína alta" }
  }

  if (obj.includes("emagrec")) {
    const kcal = Math.round(kcalBase * 0.82)
    const proteinas = Math.round((perfil.peso_kg ?? 70) * 2.2)
    const gorduras = Math.round((perfil.peso_kg ?? 70) * 0.7)
    const carbos = Math.round((kcal - proteinas * 4 - gorduras * 9) / 4)
    return { kcal, proteinas, carbos, gorduras, objetivoLabel: "Emagrecimento — déficit calórico e saciedade" }
  }

  const kcal = kcalBase
  const proteinas = Math.round((perfil.peso_kg ?? 70) * 1.6)
  const gorduras = Math.round((perfil.peso_kg ?? 70) * 0.8)
  const carbos = Math.round((kcal - proteinas * 4 - gorduras * 9) / 4)
  return { kcal, proteinas, carbos, gorduras, objetivoLabel: perfil.objetivo ?? "Plano equilibrado" }
}

function alimentoFromId(id: string, grams: number) {
  const ref = brFoodById(id)
  if (!ref) return null
  const item = brFoodToItem(ref, grams, 90)
  return {
    item: item.nome,
    qtd: `${item.quantidade_g}g`,
    kcal: item.kcal,
    proteinas_g: item.proteinas_g,
    carboidratos_g: item.carboidratos_g,
    gorduras_g: item.gorduras_g,
  }
}

/** Gera plano alimentar automático a partir do perfil fitness. */
export function generateAutoDietaPlano(
  displayName: string,
  perfil: PerfilTreinoInteligente,
): DietaPlano {
  const m = macroTargets(perfil)
  const obj = (perfil.objetivo ?? "").toLowerCase()
  const hipertrofia = obj.includes("hipertrofia") || obj.includes("força") || obj.includes("forca")

  const cafe = hipertrofia
    ? [
        alimentoFromId("ovo", 100),
        alimentoFromId("pao", 50),
        alimentoFromId("banana", 100),
        alimentoFromId("whey", 30),
      ]
    : [
        alimentoFromId("ovo", 50),
        alimentoFromId("banana", 80),
        alimentoFromId("cafe", 200),
      ]

  const almoco = [
    alimentoFromId("arroz", hipertrofia ? 180 : 120),
    alimentoFromId("feijao", 100),
    alimentoFromId("frango", hipertrofia ? 150 : 100),
    alimentoFromId("salada", 80),
  ]

  const lanche = hipertrofia
    ? [alimentoFromId("whey", 30), alimentoFromId("banana", 100)]
  : [alimentoFromId("tapioca", 60), alimentoFromId("ovo", 50)]

  const jantar = [
    alimentoFromId("frango", 120),
    alimentoFromId("batata", hipertrofia ? 150 : 100),
    alimentoFromId("salada", 70),
  ]

  const filter = <T,>(arr: (T | null)[]): T[] => arr.filter((x): x is T => x !== null)

  const refeicoes: Refeicao[] = [
    {
      id: "ref-cafe",
      tipo: "Café da Manhã",
      horario: "07:00",
      icon: Coffee,
      alimentos: filter(cafe),
    },
    {
      id: "ref-almoco",
      tipo: "Almoço",
      horario: "12:00",
      icon: Sun,
      alimentos: filter(almoco),
    },
    {
      id: "ref-lanche",
      tipo: "Lanche",
      horario: "15:30",
      icon: Apple,
      alimentos: filter(lanche),
    },
    {
      id: "ref-jantar",
      tipo: "Jantar",
      horario: "19:30",
      icon: Moon,
      alimentos: filter(jantar),
    },
  ]

  return {
    aluno: displayName || "Meu plano",
    objetivo: m.objetivoLabel,
    proteinas: m.proteinas,
    carbos: m.carbos,
    gorduras: m.gorduras,
    refeicoes,
  }
}
