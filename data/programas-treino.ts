export type NivelTreinoId = "iniciante" | "intermediario" | "avancado"

export type ExercicioPrograma = {
  nome: string
  series: string
}

export type BlocoTreino = {
  id: string
  nome: string
  exercicios: ExercicioPrograma[]
}

export type ProgramaNivel = {
  id: NivelTreinoId
  label: string
  emoji: string
  foco: string
  frequencia: string
  descanso?: string
  objetivos?: string[]
  tecnicas?: string[]
  beneficios?: string[]
  treinos: BlocoTreino[]
}

export type ProgramaGrupo = {
  id: string
  nome: string
  niveis: ProgramaNivel[]
}

export const NIVEL_META: Record<
  NivelTreinoId,
  { label: string; emoji: string; color: string; bg: string }
> = {
  iniciante: {
    label: "Iniciante",
    emoji: "🟢",
    color: "oklch(0.7 0.22 145)",
    bg: "oklch(0.7 0.22 145 / 0.12)",
  },
  intermediario: {
    label: "Intermediário",
    emoji: "🟡",
    color: "oklch(0.75 0.18 80)",
    bg: "oklch(0.75 0.18 80 / 0.12)",
  },
  avancado: {
    label: "Avançado",
    emoji: "🔴",
    color: "oklch(0.6 0.2 30)",
    bg: "oklch(0.6 0.2 30 / 0.12)",
  },
}

export const GRUPOS_PROGRAMA = [
  "Peito",
  "Costas",
  "Pernas",
  "Ombros",
  "Bíceps",
  "Tríceps",
  "Posterior",
  "Full Body",
  "Core",
] as const

function ex(nome: string, series: string): ExercicioPrograma {
  return { nome, series }
}

export const PROGRAMAS_TREINO: ProgramaGrupo[] = [
  {
    id: "peito",
    nome: "Peito",
    niveis: [
      {
        id: "iniciante",
        label: "Iniciante",
        emoji: "🟢",
        foco: "Aprender execução, ganhar força e ativar o peitoral corretamente.",
        frequencia: "Treinar peito: 1 a 2x por semana",
        descanso: "60 a 90 segundos",
        objetivos: ["Aprender postura", "Sentir o peito trabalhando", "Criar base de força"],
        treinos: [
          {
            id: "peito-ini-a",
            nome: "Treino Iniciante A",
            exercicios: [
              ex("Supino Reto", "4x10"),
              ex("Supino Inclinado com Halteres", "3x10"),
              ex("Crucifixo Máquina", "3x12"),
              ex("Flexão de Braço", "3x até falhar"),
            ],
          },
        ],
      },
      {
        id: "intermediario",
        label: "Intermediário",
        emoji: "🟡",
        foco: "Hipertrofia, volume e mais intensidade.",
        frequencia: "Treinar peito: 2x por semana",
        tecnicas: [
          "Controle na descida",
          "Contração forte no topo",
          "Aumentar carga aos poucos",
        ],
        treinos: [
          {
            id: "peito-int-a",
            nome: "Treino Intermediário A",
            exercicios: [
              ex("Supino Reto com Barra", "4x8"),
              ex("Supino Inclinado com Barra", "4x10"),
              ex("Crucifixo com Halteres", "3x12"),
              ex("Crossover", "3x12"),
              ex("Paralelas", "3x até falhar"),
            ],
          },
          {
            id: "peito-int-b",
            nome: "Treino Intermediário B",
            exercicios: [
              ex("Supino Declinado", "4x10"),
              ex("Peck Deck", "4x12"),
              ex("Flexão de Braço", "4x até falhar"),
              ex("Pullover com Halter", "3x12"),
            ],
          },
        ],
      },
      {
        id: "avancado",
        label: "Avançado",
        emoji: "🔴",
        foco: "Máximo estímulo, detalhe muscular e intensidade alta.",
        frequencia: "Treinar peito: 2x por semana com divisão pesada",
        treinos: [
          {
            id: "peito-av-a",
            nome: "Treino Avançado A (Força + Massa)",
            exercicios: [
              ex("Supino Reto Pesado", "5x5"),
              ex("Supino Inclinado com Halteres", "4x8"),
              ex("Supino Máquina", "4x10"),
              ex("Crossover Polia Alta", "4x12"),
              ex("Flexão com Peso", "3x falha"),
            ],
          },
          {
            id: "peito-av-b",
            nome: "Treino Avançado B (Volume + Isolamento)",
            exercicios: [
              ex("Crucifixo Inclinado", "4x12"),
              ex("Crossover Baixo", "4x15"),
              ex("Peck Deck", "4x15"),
              ex("Paralelas com Peso", "4x falha"),
              ex("Drop Set no Supino", "3 séries"),
            ],
          },
        ],
      },
    ],
  },
  {
    id: "costas",
    nome: "Costas",
    niveis: [
      {
        id: "iniciante",
        label: "Iniciante",
        emoji: "🟢",
        foco: "Aprender puxadas, postura e ativar dorsais.",
        frequencia: "Treinar costas: 1 a 2x por semana",
        descanso: "60 a 90 segundos",
        objetivos: ["Aprender execução", "Melhorar postura", "Criar base de força"],
        treinos: [
          {
            id: "costas-ini-a",
            nome: "Treino Iniciante A",
            exercicios: [
              ex("Puxada Frontal", "4x10"),
              ex("Remada Baixa", "3x12"),
              ex("Remada Máquina", "3x10"),
              ex("Pulldown na Polia", "3x12"),
            ],
          },
        ],
      },
      {
        id: "intermediario",
        label: "Intermediário",
        emoji: "🟡",
        foco: "Largura, espessura e hipertrofia.",
        frequencia: "Treinar costas: 2x por semana",
        tecnicas: [
          "Puxar com as costas e não só com o braço",
          "Controlar a volta do movimento",
          "Peito aberto durante as remadas",
        ],
        treinos: [
          {
            id: "costas-int-a",
            nome: "Treino Intermediário A",
            exercicios: [
              ex("Barra Fixa", "4x até falhar"),
              ex("Remada Curvada", "4x8"),
              ex("Puxada Aberta", "4x10"),
              ex("Remada Unilateral com Halter", "3x10"),
              ex("Pullover na Polia", "3x12"),
            ],
          },
          {
            id: "costas-int-b",
            nome: "Treino Intermediário B",
            exercicios: [
              ex("Remada Cavalinho", "4x10"),
              ex("Puxada Supinada", "4x10"),
              ex("Remada Baixa Fechada", "3x12"),
              ex("Encolhimento para Trapézio", "4x12"),
            ],
          },
        ],
      },
      {
        id: "avancado",
        label: "Avançado",
        emoji: "🔴",
        foco: "Densidade, largura extrema e força.",
        frequencia: "Treinar costas: 2x por semana pesado",
        treinos: [
          {
            id: "costas-av-a",
            nome: "Treino Avançado A (Largura)",
            exercicios: [
              ex("Barra Fixa com Peso", "5x até falhar"),
              ex("Puxada Aberta na Frente", "4x10"),
              ex("Pulldown", "4x12"),
              ex("Remada Unilateral", "4x10"),
              ex("Drop Set na Puxada", "3 séries"),
            ],
          },
          {
            id: "costas-av-b",
            nome: "Treino Avançado B (Espessura)",
            exercicios: [
              ex("Levantamento Terra", "5x5"),
              ex("Remada Curvada Pesada", "4x8"),
              ex("Remada Cavalinho", "4x10"),
              ex("Remada Baixa", "4x12"),
              ex("Hiperextensão Lombar", "3x15"),
            ],
          },
        ],
      },
    ],
  },
  {
    id: "pernas",
    nome: "Pernas",
    niveis: [
      {
        id: "iniciante",
        label: "Iniciante",
        emoji: "🟢",
        foco: "Aprender movimento, equilíbrio e resistência.",
        frequencia: "Treinar pernas: 1 a 2x por semana",
        descanso: "60 a 90 segundos",
        objetivos: ["Aprender postura", "Melhorar mobilidade", "Criar base de força"],
        treinos: [
          {
            id: "pernas-ini-a",
            nome: "Treino Iniciante A",
            exercicios: [
              ex("Agachamento Livre", "4x10"),
              ex("Leg Press", "4x12"),
              ex("Cadeira Extensora", "3x12"),
              ex("Mesa Flexora", "3x12"),
              ex("Panturrilha em Pé", "4x15"),
            ],
          },
        ],
      },
      {
        id: "intermediario",
        label: "Intermediário",
        emoji: "🟡",
        foco: "Hipertrofia e volume muscular.",
        frequencia: "Treinar pernas: 2x por semana",
        tecnicas: ["Descer controlando", "Priorizar amplitude", "Não roubar movimento"],
        treinos: [
          {
            id: "pernas-int-a",
            nome: "Treino Intermediário A (Quadríceps)",
            exercicios: [
              ex("Agachamento Livre", "4x8"),
              ex("Leg Press 45°", "4x10"),
              ex("Afundo com Halteres", "3x10"),
              ex("Cadeira Extensora", "4x12"),
              ex("Panturrilha Sentado", "4x15"),
            ],
          },
          {
            id: "pernas-int-b",
            nome: "Treino Intermediário B (Posterior e Glúteo)",
            exercicios: [
              ex("Stiff", "4x10"),
              ex("Mesa Flexora", "4x12"),
              ex("Levantamento Terra Romeno", "3x10"),
              ex("Cadeira Abdutora", "3x15"),
              ex("Panturrilha no Leg Press", "4x20"),
            ],
          },
        ],
      },
      {
        id: "avancado",
        label: "Avançado",
        emoji: "🔴",
        foco: "Força, densidade e máxima hipertrofia.",
        frequencia: "Treinar pernas: 2x por semana pesado",
        treinos: [
          {
            id: "pernas-av-a",
            nome: "Treino Avançado A (Força)",
            exercicios: [
              ex("Agachamento Livre Pesado", "5x5"),
              ex("Leg Press Pesado", "5x10"),
              ex("Hack Squat", "4x10"),
              ex("Afundo Andando", "3x12"),
              ex("Panturrilha em Pé", "5x20"),
            ],
          },
          {
            id: "pernas-av-b",
            nome: "Treino Avançado B (Posterior Completo)",
            exercicios: [
              ex("Levantamento Terra", "5x5"),
              ex("Stiff Pesado", "4x8"),
              ex("Mesa Flexora Unilateral", "4x12"),
              ex("Glute Bridge", "4x12"),
              ex("Drop Set na Extensora", "3 séries"),
            ],
          },
        ],
      },
    ],
  },
  {
    id: "ombros",
    nome: "Ombros",
    niveis: [
      {
        id: "iniciante",
        label: "Iniciante",
        emoji: "🟢",
        foco: "Aprender movimento, estabilidade e ativação.",
        frequencia: "Treinar ombro: 1 a 2x por semana",
        descanso: "60 a 90 segundos",
        objetivos: ["Aprender postura", "Melhorar estabilidade", "Criar base de força"],
        treinos: [
          {
            id: "ombros-ini-a",
            nome: "Treino Iniciante A",
            exercicios: [
              ex("Desenvolvimento com Halteres", "4x10"),
              ex("Elevação Lateral", "3x12"),
              ex("Elevação Frontal", "3x12"),
              ex("Crucifixo Invertido", "3x12"),
            ],
          },
        ],
      },
      {
        id: "intermediario",
        label: "Intermediário",
        emoji: "🟡",
        foco: "Largura, definição e hipertrofia.",
        frequencia: "Treinar ombro: 2x por semana",
        tecnicas: [
          "Não subir peso roubando",
          "Movimento controlado",
          "Cotovelo levemente flexionado",
        ],
        treinos: [
          {
            id: "ombros-int-a",
            nome: "Treino Intermediário A",
            exercicios: [
              ex("Desenvolvimento Militar", "4x8"),
              ex("Elevação Lateral com Halteres", "4x12"),
              ex("Arnold Press", "3x10"),
              ex("Crucifixo Invertido na Máquina", "4x12"),
              ex("Encolhimento para Trapézio", "4x12"),
            ],
          },
          {
            id: "ombros-int-b",
            nome: "Treino Intermediário B",
            exercicios: [
              ex("Desenvolvimento na Máquina", "4x10"),
              ex("Elevação Lateral na Polia", "4x12"),
              ex("Elevação Frontal com Anilha", "3x12"),
              ex("Face Pull", "4x15"),
            ],
          },
        ],
      },
      {
        id: "avancado",
        label: "Avançado",
        emoji: "🔴",
        foco: "Ombro 3D, densidade e máxima definição.",
        frequencia: "Treinar ombro: 2x por semana pesado",
        treinos: [
          {
            id: "ombros-av-a",
            nome: "Treino Avançado A (Largura)",
            exercicios: [
              ex("Desenvolvimento Militar Pesado", "5x5"),
              ex("Elevação Lateral Pesada", "4x10"),
              ex("Arnold Press", "4x10"),
              ex("Drop Set Elevação Lateral", "3 séries"),
              ex("Face Pull", "4x15"),
            ],
          },
          {
            id: "ombros-av-b",
            nome: "Treino Avançado B (Detalhamento)",
            exercicios: [
              ex("Elevação Lateral na Polia", "4x15"),
              ex("Crucifixo Invertido", "4x15"),
              ex("Desenvolvimento com Halteres", "4x10"),
              ex("Encolhimento Pesado", "5x12"),
              ex("Bi-Set Elevação Frontal e Lateral", "3 séries"),
            ],
          },
        ],
      },
    ],
  },
  {
    id: "biceps",
    nome: "Bíceps",
    niveis: [
      {
        id: "iniciante",
        label: "Iniciante",
        emoji: "🟢",
        foco: "Aprender movimento e ativar corretamente o bíceps.",
        frequencia: "Treinar bíceps: 1 a 2x por semana",
        descanso: "45 a 60 segundos",
        objetivos: ["Aprender execução", "Melhorar conexão mente-músculo", "Criar base de força"],
        treinos: [
          {
            id: "biceps-ini-a",
            nome: "Treino Iniciante A",
            exercicios: [
              ex("Rosca Direta", "4x10"),
              ex("Rosca Alternada", "3x12"),
              ex("Rosca Martelo", "3x12"),
              ex("Rosca Scott Máquina", "3x10"),
            ],
          },
        ],
      },
      {
        id: "intermediario",
        label: "Intermediário",
        emoji: "🟡",
        foco: "Hipertrofia, pico e volume muscular.",
        frequencia: "Treinar bíceps: 2x por semana",
        tecnicas: [
          "Não balançar o corpo",
          "Subida forte e descida controlada",
          "Apertar o bíceps no topo",
        ],
        treinos: [
          {
            id: "biceps-int-a",
            nome: "Treino Intermediário A",
            exercicios: [
              ex("Rosca Direta com Barra W", "4x8"),
              ex("Rosca Scott", "4x10"),
              ex("Rosca Alternada Sentado", "3x12"),
              ex("Rosca Concentrada", "3x12"),
              ex("Rosca Martelo", "3x12"),
            ],
          },
          {
            id: "biceps-int-b",
            nome: "Treino Intermediário B",
            exercicios: [
              ex("Rosca na Polia", "4x12"),
              ex("Rosca Inclinada", "4x10"),
              ex("Rosca 21", "3 séries"),
              ex("Rosca Martelo Cruzada", "3x12"),
            ],
          },
        ],
      },
      {
        id: "avancado",
        label: "Avançado",
        emoji: "🔴",
        foco: "Máximo volume, densidade e detalhamento.",
        frequencia: "Treinar bíceps: 2x por semana pesado",
        treinos: [
          {
            id: "biceps-av-a",
            nome: "Treino Avançado A (Massa)",
            exercicios: [
              ex("Rosca Direta Pesada", "5x5"),
              ex("Rosca Scott Pesada", "4x8"),
              ex("Rosca Alternada", "4x10"),
              ex("Rosca Martelo", "4x10"),
              ex("Drop Set Rosca na Polia", "3 séries"),
            ],
          },
          {
            id: "biceps-av-b",
            nome: "Treino Avançado B (Detalhamento)",
            exercicios: [
              ex("Rosca Concentrada", "4x12"),
              ex("Rosca Inclinada", "4x12"),
              ex("Bi-Set Rosca Direta e Martelo", "3 séries"),
              ex("Rosca na Polia Alta", "4x15"),
              ex("Rosca 21", "3 séries"),
            ],
          },
        ],
      },
    ],
  },
  {
    id: "triceps",
    nome: "Tríceps",
    niveis: [
      {
        id: "iniciante",
        label: "Iniciante",
        emoji: "🟢",
        foco: "Aprender execução e ativar corretamente o tríceps.",
        frequencia: "Treinar tríceps: 1 a 2x por semana",
        descanso: "45 a 60 segundos",
        objetivos: ["Melhorar técnica", "Criar base de força", "Aprender controle do movimento"],
        treinos: [
          {
            id: "triceps-ini-a",
            nome: "Treino Iniciante A",
            exercicios: [
              ex("Tríceps Pulley", "4x10"),
              ex("Tríceps Francês", "3x12"),
              ex("Tríceps Corda", "3x12"),
              ex("Mergulho no Banco", "3x até falhar"),
            ],
          },
        ],
      },
      {
        id: "intermediario",
        label: "Intermediário",
        emoji: "🟡",
        foco: "Hipertrofia e volume muscular.",
        frequencia: "Treinar tríceps: 2x por semana",
        tecnicas: ["Cotovelo parado", "Movimento controlado", "Contração forte no final"],
        treinos: [
          {
            id: "triceps-int-a",
            nome: "Treino Intermediário A",
            exercicios: [
              ex("Supino Fechado", "4x8"),
              ex("Tríceps Testa", "4x10"),
              ex("Tríceps Corda", "4x12"),
              ex("Tríceps Francês Unilateral", "3x12"),
              ex("Mergulho nas Paralelas", "3x até falhar"),
            ],
          },
          {
            id: "triceps-int-b",
            nome: "Treino Intermediário B",
            exercicios: [
              ex("Tríceps Barra Reta", "4x10"),
              ex("Tríceps Coice", "3x12"),
              ex("Tríceps na Polia Invertido", "3x12"),
              ex("Bi-Set Corda e Pulley", "3 séries"),
            ],
          },
        ],
      },
      {
        id: "avancado",
        label: "Avançado",
        emoji: "🔴",
        foco: "Densidade, definição e máximo volume.",
        frequencia: "Treinar tríceps: 2x por semana pesado",
        treinos: [
          {
            id: "triceps-av-a",
            nome: "Treino Avançado A (Massa)",
            exercicios: [
              ex("Supino Fechado Pesado", "5x5"),
              ex("Tríceps Testa Pesado", "4x8"),
              ex("Mergulho com Peso", "4x10"),
              ex("Tríceps Corda", "4x12"),
              ex("Drop Set no Pulley", "3 séries"),
            ],
          },
          {
            id: "triceps-av-b",
            nome: "Treino Avançado B (Detalhamento)",
            exercicios: [
              ex("Tríceps Francês", "4x12"),
              ex("Tríceps Unilateral na Polia", "4x12"),
              ex("Coice com Halter", "4x15"),
              ex("Bi-Set Testa e Corda", "3 séries"),
              ex("Mergulho nas Paralelas", "3x falha"),
            ],
          },
        ],
      },
    ],
  },
  {
    id: "posterior",
    nome: "Posterior",
    niveis: [
      {
        id: "iniciante",
        label: "Iniciante",
        emoji: "🟢",
        foco: "Aprender execução e ativar posterior corretamente.",
        frequencia: "Treinar posterior: 1 a 2x por semana",
        descanso: "60 a 90 segundos",
        objetivos: ["Aprender postura", "Melhorar mobilidade", "Criar base de força"],
        treinos: [
          {
            id: "posterior-ini-a",
            nome: "Treino Iniciante A",
            exercicios: [
              ex("Mesa Flexora", "4x12"),
              ex("Stiff com Halteres", "3x10"),
              ex("Cadeira Flexora", "3x12"),
              ex("Glute Bridge", "3x12"),
            ],
          },
        ],
      },
      {
        id: "intermediario",
        label: "Intermediário",
        emoji: "🟡",
        foco: "Hipertrofia e densidade muscular.",
        frequencia: "Treinar posterior: 2x por semana",
        tecnicas: [
          "Quadril indo para trás no stiff",
          "Não curvar lombar",
          "Alongar bem o posterior",
        ],
        treinos: [
          {
            id: "posterior-int-a",
            nome: "Treino Intermediário A",
            exercicios: [
              ex("Stiff", "4x10"),
              ex("Mesa Flexora", "4x12"),
              ex("Levantamento Terra Romeno", "4x10"),
              ex("Flexora Unilateral", "3x12"),
              ex("Glute Bridge", "4x12"),
            ],
          },
          {
            id: "posterior-int-b",
            nome: "Treino Intermediário B",
            exercicios: [
              ex("Good Morning", "4x10"),
              ex("Cadeira Flexora", "4x12"),
              ex("Afundo", "3x10"),
              ex("Hiperextensão Lombar", "3x15"),
            ],
          },
        ],
      },
      {
        id: "avancado",
        label: "Avançado",
        emoji: "🔴",
        foco: "Força, detalhamento e máxima hipertrofia.",
        frequencia: "Treinar posterior: 2x por semana pesado",
        treinos: [
          {
            id: "posterior-av-a",
            nome: "Treino Avançado A (Força)",
            exercicios: [
              ex("Levantamento Terra", "5x5"),
              ex("Stiff Pesado", "4x8"),
              ex("Mesa Flexora Pesada", "4x10"),
              ex("Good Morning", "4x10"),
              ex("Panturrilha no Leg Press", "4x20"),
            ],
          },
          {
            id: "posterior-av-b",
            nome: "Treino Avançado B (Detalhamento)",
            exercicios: [
              ex("Flexora Unilateral", "4x12"),
              ex("Stiff com Halteres", "4x12"),
              ex("Glute Bridge Pesado", "4x10"),
              ex("Drop Set Mesa Flexora", "3 séries"),
              ex("Hiperextensão Lombar", "4x15"),
            ],
          },
        ],
      },
    ],
  },
  {
    id: "full-body",
    nome: "Full Body",
    niveis: [
      {
        id: "iniciante",
        label: "Iniciante",
        emoji: "🟢",
        foco: "Adaptação muscular e aprender movimentos básicos.",
        frequencia: "Treinar: 3x por semana",
        descanso: "60 segundos",
        treinos: [
          {
            id: "fb-ini-a",
            nome: "Full Body Iniciante A",
            exercicios: [
              ex("Agachamento Livre", "3x10"),
              ex("Supino Reto", "3x10"),
              ex("Puxada Frontal", "3x10"),
              ex("Desenvolvimento com Halteres", "3x12"),
              ex("Rosca Direta", "3x12"),
              ex("Tríceps Pulley", "3x12"),
              ex("Panturrilha em Pé", "3x15"),
            ],
          },
        ],
      },
      {
        id: "intermediario",
        label: "Intermediário",
        emoji: "🟡",
        foco: "Hipertrofia e aumento de intensidade.",
        frequencia: "Treinar: 3 a 4x por semana",
        treinos: [
          {
            id: "fb-int-a",
            nome: "Full Body Intermediário A",
            exercicios: [
              ex("Agachamento Livre", "4x8"),
              ex("Supino Inclinado", "4x10"),
              ex("Remada Curvada", "4x10"),
              ex("Desenvolvimento Militar", "3x10"),
              ex("Stiff", "3x10"),
              ex("Rosca Martelo", "3x12"),
              ex("Tríceps Corda", "3x12"),
              ex("Abdominal Infra", "3x15"),
            ],
          },
          {
            id: "fb-int-b",
            nome: "Full Body Intermediário B",
            exercicios: [
              ex("Leg Press", "4x10"),
              ex("Supino Reto com Halteres", "4x10"),
              ex("Barra Fixa", "4x falha"),
              ex("Elevação Lateral", "4x12"),
              ex("Mesa Flexora", "3x12"),
              ex("Rosca Scott", "3x10"),
              ex("Tríceps Testa", "3x10"),
              ex("Prancha", "3x40 segundos"),
            ],
          },
        ],
      },
      {
        id: "avancado",
        label: "Avançado",
        emoji: "🔴",
        foco: "Intensidade alta, força e volume.",
        frequencia: "Treinar: 4x por semana",
        beneficios: [
          "Maior gasto calórico",
          "Boa frequência muscular",
          "Ótimo para naturais",
          "Mais condicionamento",
          "Excelente para ganho de massa e emagrecimento",
        ],
        treinos: [
          {
            id: "fb-av-a",
            nome: "Full Body Avançado A",
            exercicios: [
              ex("Levantamento Terra", "5x5"),
              ex("Agachamento Livre Pesado", "5x5"),
              ex("Supino Reto Pesado", "5x5"),
              ex("Barra Fixa com Peso", "4x falha"),
              ex("Desenvolvimento Militar", "4x8"),
              ex("Rosca Direta Pesada", "4x8"),
              ex("Paralelas com Peso", "4x falha"),
              ex("Panturrilha no Leg Press", "5x20"),
            ],
          },
          {
            id: "fb-av-b",
            nome: "Full Body Avançado B",
            exercicios: [
              ex("Hack Squat", "4x10"),
              ex("Supino Inclinado com Halteres", "4x10"),
              ex("Remada Cavalinho", "4x10"),
              ex("Arnold Press", "4x10"),
              ex("Stiff Pesado", "4x10"),
              ex("Rosca 21", "3 séries"),
              ex("Drop Set Tríceps Pulley", "3 séries"),
              ex("Abdominal na Polia", "4x15"),
            ],
          },
        ],
      },
    ],
  },
  {
    id: "core",
    nome: "Core",
    niveis: [
      {
        id: "iniciante",
        label: "Iniciante",
        emoji: "🟢",
        foco: "Estabilidade e resistência básica.",
        frequencia: "Treinar core: 2 a 3x por semana",
        descanso: "30 a 45 segundos",
        treinos: [
          {
            id: "core-ini-a",
            nome: "Core Iniciante A",
            exercicios: [
              ex("Prancha", "3x30 segundos"),
              ex("Abdominal Tradicional", "3x15"),
              ex("Elevação de Joelhos", "3x12"),
              ex("Prancha Lateral", "3x20 segundos cada lado"),
              ex("Superman", "3x15"),
            ],
          },
        ],
      },
      {
        id: "intermediario",
        label: "Intermediário",
        emoji: "🟡",
        foco: "Força do core e controle abdominal.",
        frequencia: "Treinar core: 3x por semana",
        descanso: "30 a 45 segundos",
        treinos: [
          {
            id: "core-int-a",
            nome: "Core Intermediário A",
            exercicios: [
              ex("Prancha", "4x45 segundos"),
              ex("Abdominal na Polia", "4x15"),
              ex("Elevação de Pernas", "3x12"),
              ex("Russian Twist", "3x20"),
              ex("Prancha com Toque no Ombro", "3x30 segundos"),
            ],
          },
        ],
      },
      {
        id: "avancado",
        label: "Avançado",
        emoji: "🔴",
        foco: "Core forte, estabilidade máxima e resistência.",
        frequencia: "Treinar core: 3 a 4x por semana",
        treinos: [
          {
            id: "core-av-a",
            nome: "Core Avançado A",
            exercicios: [
              ex("Prancha com Peso", "4x60 segundos"),
              ex("Abdominal Dragon Flag", "4x8"),
              ex("Hanging Leg Raise", "4x12"),
              ex("Roda Abdominal", "4x10"),
              ex("Farmer Walk", "3x40 metros"),
            ],
          },
        ],
      },
    ],
  },
]

export function getProgramaByGrupo(nome: string): ProgramaGrupo | undefined {
  return PROGRAMAS_TREINO.find((g) => g.nome === nome)
}

export function countTreinosPrograma(): number {
  return PROGRAMAS_TREINO.reduce(
    (acc, g) => acc + g.niveis.reduce((a, n) => a + n.treinos.length, 0),
    0,
  )
}
