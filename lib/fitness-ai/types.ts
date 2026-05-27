export type ChatMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  createdAt: string
}

export type FitnessUserContext = {
  displayName: string
  objetivo: string
  nivel: string
  peso_kg: number | null
  altura_cm: number | null
  idade: number | null
  sexo: string | null
  frequencia_semanal: number | null
  imc: number | null
  classificacao_imc: string | null
  treino_resumo: string | null
  ultimo_treino_dia: string | null
  dieta_objetivo: string | null
  macros_alvo: { proteinas: number; carbos: number; gorduras: number; kcal_estimada: number } | null
  refeicoes_recentes: string[]
  evolucao_resumo: string | null
  isPremium: boolean
}

export type FitnessMemorySnapshot = {
  lastUserMessage?: string
  lastAssistantMessage?: string
  lastMealScan?: string
  notes?: string
}
