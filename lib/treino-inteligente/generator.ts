import type { NivelTreinoId } from "@/data/programas-treino"
import { PROGRAMAS_TREINO } from "@/data/programas-treino"

export type NivelAluno = NivelTreinoId
export type SexoAluno = "masculino" | "feminino" | "outro"

export type PerfilTreinoInteligente = {
  peso_kg: number
  altura_cm: number
  idade: number
  sexo: SexoAluno
  objetivo: string
  nivel: NivelAluno
  frequencia_semanal: number
  limitacoes?: string | null
  percentual_gordura?: number | null
}

export type ExercicioGerado = {
  nome: string
  series: string
  grupo: string
}

export type DiaTreinoGerado = {
  id: string
  nome: string
  foco: string
  exercicios: ExercicioGerado[]
}

export type CardioGerado = {
  tipo: string
  duracao_min: number
  intensidade: string
  notas: string
}

export type TreinoInteligenteGerado = {
  versao: number
  gerado_em: string
  imc: number
  classificacao_imc: string
  nivel: NivelAluno
  objetivo: string
  frequencia_semanal: number
  split: string
  dias: DiaTreinoGerado[]
  cardio: CardioGerado
  progresso_pct: number
  observacoes: string[]
}

const SPLIT_BY_FREQ: Record<number, string[][]> = {
  2: [["Peito", "Costas", "Pernas", "Core"], ["Ombros", "Bíceps", "Tríceps", "Full Body"]],
  3: [["Peito", "Tríceps"], ["Costas", "Bíceps"], ["Pernas", "Posterior"]],
  4: [["Peito", "Tríceps"], ["Costas", "Bíceps"], ["Pernas"], ["Ombros", "Core"]],
  5: [["Peito"], ["Costas"], ["Pernas"], ["Ombros"], ["Bíceps", "Tríceps"]],
  6: [["Peito", "Tríceps"], ["Costas", "Bíceps"], ["Pernas"], ["Peito", "Tríceps"], ["Costas", "Bíceps"], ["Pernas", "Posterior"]],
}

const LIMITACOES_BLOCK: Record<string, string[]> = {
  joelho: ["Agachamento Livre", "Leg Press 45°", "Afundo"],
  lombar: ["Levantamento Terra", "Stiff com Barra"],
  ombro: ["Desenvolvimento Militar", "Elevação Lateral"],
}

function clampFreq(n: number): number {
  if (!Number.isFinite(n)) return 3
  return Math.min(6, Math.max(2, Math.round(n)))
}

export function calcularImc(pesoKg: number, alturaCm: number): number {
  const h = alturaCm / 100
  if (h <= 0 || pesoKg <= 0) return 0
  return Math.round((pesoKg / (h * h)) * 10) / 10
}

export function classificarImc(imc: number): string {
  if (imc <= 0) return "—"
  if (imc < 18.5) return "Abaixo do peso"
  if (imc < 25) return "Normal"
  if (imc < 30) return "Sobrepeso"
  return "Obesidade"
}

function seriesForNivel(nivel: NivelAluno, objetivo: string): string {
  const obj = objetivo.toLowerCase()
  if (nivel === "iniciante") return obj.includes("força") ? "3x8" : "3x12"
  if (nivel === "intermediario") return obj.includes("força") ? "4x6" : "4x10"
  return obj.includes("força") ? "5x5" : "4x8"
}

function cardioForPerfil(perfil: PerfilTreinoInteligente, imc: number): CardioGerado {
  const obj = perfil.objetivo.toLowerCase()
  if (obj.includes("emagrec") || obj.includes("perda") || imc >= 27) {
    return {
      tipo: "Cardio moderado",
      duracao_min: 30,
      intensidade: "60–70% FC máx",
      notas: "Caminhada inclinada, bike ou elíptico após musculação.",
    }
  }
  if (obj.includes("resist") || obj.includes("condicion")) {
    return {
      tipo: "HIIT leve",
      duracao_min: 20,
      intensidade: "Intervalos 1:1",
      notas: "Aquecimento 5 min + 8–10 intervalos de 30s.",
    }
  }
  if (obj.includes("força")) {
    return {
      tipo: "Aquecimento",
      duracao_min: 10,
      intensidade: "Leve",
      notas: "Mobilidade + 5 min bike antes do treino.",
    }
  }
  return {
    tipo: "Cardio leve",
    duracao_min: 15,
    intensidade: "50–60% FC máx",
    notas: "Opcional após treino para recuperação.",
  }
}

function findExercises(grupoNome: string, nivel: NivelAluno, limitacoes: string): ExercicioGerado[] {
  const grupo = PROGRAMAS_TREINO.find(
    (g) => g.nome.toLowerCase() === grupoNome.toLowerCase() || g.id === grupoNome.toLowerCase(),
  )
  if (!grupo) return []

  const programa = grupo.niveis.find((n) => n.id === nivel) ?? grupo.niveis[0]
  const bloco = programa?.treinos[0]
  if (!bloco) return []

  const blocked = new Set<string>()
  const lim = limitacoes.toLowerCase()
  for (const [key, names] of Object.entries(LIMITACOES_BLOCK)) {
    if (lim.includes(key)) names.forEach((n) => blocked.add(n.toLowerCase()))
  }

  return bloco.exercicios
    .filter((e) => !blocked.has(e.nome.toLowerCase()))
    .slice(0, 4)
    .map((e) => ({
      nome: e.nome,
      series: e.series || seriesForNivel(nivel, "hipertrofia"),
      grupo: grupo.nome,
    }))
}

export function gerarTreinoInteligente(
  perfil: PerfilTreinoInteligente,
  versao = 1,
  progressoAnterior = 0,
): TreinoInteligenteGerado {
  const freq = clampFreq(perfil.frequencia_semanal)
  const imc = calcularImc(perfil.peso_kg, perfil.altura_cm)
  const split = SPLIT_BY_FREQ[freq] ?? SPLIT_BY_FREQ[3]
  const limitacoes = perfil.limitacoes?.trim() ?? ""
  const seriesTpl = seriesForNivel(perfil.nivel, perfil.objetivo)

  const dias: DiaTreinoGerado[] = split.map((grupos, i) => {
    const exercicios: ExercicioGerado[] = []
    for (const g of grupos) {
      const found = findExercises(g, perfil.nivel, limitacoes)
      if (found.length) exercicios.push(...found)
      else {
        exercicios.push({
          nome: `${g} — circuito guiado`,
          series: seriesTpl,
          grupo: g,
        })
      }
    }
    const uniq = new Map<string, ExercicioGerado>()
    for (const ex of exercicios) {
      if (!uniq.has(ex.nome)) uniq.set(ex.nome, ex)
    }
    return {
      id: `dia-${i + 1}`,
      nome: `Dia ${String.fromCharCode(65 + i)}`,
      foco: grupos.join(" · "),
      exercicios: [...uniq.values()].slice(0, 6),
    }
  })

  const progresso_pct = Math.min(100, Math.round(progressoAnterior + 8 + freq))

  const observacoes: string[] = []
  if (imc >= 30) observacoes.push("Priorize execução controlada e cardio pós-treino.")
  if (perfil.idade >= 50) observacoes.push("Aqueça 8–10 min e evite cargas máximas sem supervisão.")
  if (limitacoes) observacoes.push(`Limitações consideradas: ${limitacoes}`)
  if (perfil.percentual_gordura != null && perfil.percentual_gordura > 25) {
    observacoes.push("Déficit calórico leve + proteína adequada aceleram recomposição.")
  }

  return {
    versao,
    gerado_em: new Date().toISOString(),
    imc,
    classificacao_imc: classificarImc(imc),
    nivel: perfil.nivel,
    objetivo: perfil.objetivo,
    frequencia_semanal: freq,
    split: `${freq}x/semana — ${split.length} sessões programadas`,
    dias,
    cardio: cardioForPerfil(perfil, imc),
    progresso_pct,
    observacoes,
  }
}
