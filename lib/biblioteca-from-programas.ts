import {
  NIVEL_META,
  PROGRAMAS_TREINO,
  type NivelTreinoId,
} from "@/data/programas-treino"

export type BibliotecaExercicio = {
  id: string
  nome: string
  grupo: string
  equipamento: string
  nivel: string
  video: boolean
  descricao: string
  series: string
  ficha: string
}

function slug(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48)
}

function inferEquipamento(nome: string): string {
  const n = nome.toLowerCase()
  if (/polia|pulley|crossover|puxada|remada baixa|face pull|corda|pulldown/i.test(nome)) return "Polia"
  if (/máquina|maquina|leg press|peck deck|hack|cadeira|mesa flexora|extensora|abdutora|flexora|smith/i.test(nome))
    return "Máquina"
  if (/halter|halteres|arnold|afundo|stiff|pullover|concentrada|unilateral|coice|francês|frances/i.test(nome))
    return "Halteres"
  if (/barra|supino|agachamento|terra|remada|rosca|desenvolvimento|mergulho|paralelas|fixa|good morning/i.test(nome))
    return "Barra"
  if (/prancha|flexão|flexao|abdominal|superman|burpee|ponte|bridge/i.test(nome)) return "Nenhum"
  return "Máquina"
}

/** Lista completa de exercícios extraídos de todos os programas (iniciante, intermediário e avançado). */
export function buildBibliotecaFromProgramas(): BibliotecaExercicio[] {
  const list: BibliotecaExercicio[] = []
  const seen = new Set<string>()

  for (const grupo of PROGRAMAS_TREINO) {
    for (const nivel of grupo.niveis) {
      const nivelLabel = NIVEL_META[nivel.id as NivelTreinoId].label
      for (const treino of nivel.treinos) {
        for (const ex of treino.exercicios) {
          const key = `${grupo.nome}|${nivel.id}|${ex.nome}`
          if (seen.has(key)) continue
          seen.add(key)

          list.push({
            id: `bib-${grupo.id}-${nivel.id}-${slug(ex.nome)}`,
            nome: ex.nome,
            grupo: grupo.nome,
            equipamento: inferEquipamento(ex.nome),
            nivel: nivelLabel,
            video: false,
            series: ex.series,
            ficha: treino.nome,
            descricao: `${treino.nome} · ${ex.series} · ${nivel.emoji} ${nivel.label}`,
          })
        }
      }
    }
  }

  return list.sort((a, b) => {
    const g = a.grupo.localeCompare(b.grupo, "pt")
    if (g !== 0) return g
    const n = a.nivel.localeCompare(b.nivel, "pt")
    if (n !== 0) return n
    return a.nome.localeCompare(b.nome, "pt")
  })
}

/** Lista pré-calculada (usada na página de exercícios). */
export const BIBLIOTECA_EXERCICIOS = buildBibliotecaFromProgramas()

export function countBibliotecaPorGrupo(): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const ex of BIBLIOTECA_EXERCICIOS) {
    counts[ex.grupo] = (counts[ex.grupo] ?? 0) + 1
  }
  return counts
}
