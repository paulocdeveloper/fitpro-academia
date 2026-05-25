import { z } from "zod"
import type { NivelAluno, PerfilTreinoInteligente, SexoAluno } from "@/lib/treino-inteligente/generator"

export const SEXOS_TREINO = ["masculino", "feminino", "outro"] as const
export const NIVEIS_TREINO = ["iniciante", "intermediario", "avancado"] as const
export const OBJETIVOS_TREINO = [
  "Hipertrofia",
  "Emagrecimento",
  "Condicionamento",
  "Força",
  "Saúde",
] as const

export type ObjetivoTreino = (typeof OBJETIVOS_TREINO)[number]

const NIVEL_ALIASES: Record<string, NivelAluno> = {
  iniciante: "iniciante",
  intermediario: "intermediario",
  intermediário: "intermediario",
  avancado: "avancado",
  avançado: "avancado",
  advanced: "avancado",
  beginner: "iniciante",
}

const SEXO_ALIASES: Record<string, SexoAluno> = {
  masculino: "masculino",
  m: "masculino",
  homem: "masculino",
  feminino: "feminino",
  f: "feminino",
  mulher: "feminino",
  outro: "outro",
  outros: "outro",
}

const OBJETIVO_ALIASES: Record<string, ObjetivoTreino> = {
  hipertrofia: "Hipertrofia",
  emagrecimento: "Emagrecimento",
  emagrecer: "Emagrecimento",
  perda: "Emagrecimento",
  condicionamento: "Condicionamento",
  força: "Força",
  forca: "Força",
  saude: "Saúde",
  saúde: "Saúde",
}

/** Converte string/number do formulário ou JSON em número finito. */
export function parseNumeroCampo(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined
  }
  if (typeof value === "string") {
    const s = value.trim().replace(/\s/g, "").replace(",", ".")
    if (s === "" || s === "-" || s === ".") return undefined
    const n = Number(s)
    return Number.isFinite(n) ? n : undefined
  }
  return undefined
}

export function normalizeSexo(raw: unknown): SexoAluno {
  const key = String(raw ?? "")
    .trim()
    .toLowerCase()
  return SEXO_ALIASES[key] ?? "outro"
}

export function normalizeNivel(raw: unknown): NivelAluno {
  const key = String(raw ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
  return NIVEL_ALIASES[key] ?? NIVEL_ALIASES[String(raw ?? "").trim().toLowerCase()] ?? "iniciante"
}

export function normalizeObjetivo(raw: unknown): ObjetivoTreino {
  const s = String(raw ?? "").trim()
  if (!s) return "Hipertrofia"
  const key = s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
  if (OBJETIVO_ALIASES[key]) return OBJETIVO_ALIASES[key]
  const match = OBJETIVOS_TREINO.find((o) => o.toLowerCase() === s.toLowerCase())
  return match ?? "Hipertrofia"
}

export function normalizePerfil(input: Partial<PerfilTreinoInteligente> | null | undefined): PerfilTreinoInteligente {
  const src = input ?? {}
  const limitacoesRaw = src.limitacoes
  const limitacoes =
    limitacoesRaw === null || limitacoesRaw === undefined
      ? null
      : String(limitacoesRaw).trim() || null

  const percentual_gordura = normalizeGorduraOpcional(src.percentual_gordura)

  return {
    peso_kg: parseNumeroCampo(src.peso_kg) ?? 70,
    altura_cm: parseNumeroCampo(src.altura_cm) ?? 170,
    idade: parseNumeroCampo(src.idade) ?? 25,
    sexo: normalizeSexo(src.sexo),
    objetivo: normalizeObjetivo(src.objetivo),
    nivel: normalizeNivel(src.nivel),
    frequencia_semanal: clampFrequencia(parseNumeroCampo(src.frequencia_semanal) ?? 3),
    limitacoes,
    percentual_gordura,
  }
}

function clampFrequencia(n: number): number {
  return Math.min(6, Math.max(2, Math.round(n)))
}

/** % gordura opcional: vazio/inválido → null; nunca NaN. */
export function normalizeGorduraOpcional(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null
  const n = parseNumeroCampo(value)
  if (n === undefined || !Number.isFinite(n)) return null
  return Math.round(n * 10) / 10
}

const perfilPutSchema = z
  .object({
    peso_kg: z.preprocess(
      (v) => parseNumeroCampo(v),
      z
        .number({ required_error: "Informe o peso", invalid_type_error: "Peso inválido" })
        .min(30, "Peso inválido (mín. 30 kg)")
        .max(300, "Peso inválido (máx. 300 kg)"),
    ),
    altura_cm: z.preprocess(
      (v) => parseNumeroCampo(v),
      z
        .number({ required_error: "Informe a altura", invalid_type_error: "Altura inválida" })
        .min(100, "Altura inválida (mín. 100 cm)")
        .max(250, "Altura inválida (máx. 250 cm)"),
    ),
    idade: z.preprocess(
      (v) => parseNumeroCampo(v),
      z
        .number({ required_error: "Informe a idade", invalid_type_error: "Idade inválida" })
        .int("Idade inválida")
        .min(12, "Idade inválida (mín. 12 anos)")
        .max(100, "Idade inválida (máx. 100 anos)"),
    ),
    frequencia_semanal: z.preprocess(
      (v) => parseNumeroCampo(v),
      z
        .number({ invalid_type_error: "Frequência inválida" })
        .int("Frequência inválida")
        .min(2, "Frequência entre 2 e 6 dias")
        .max(6, "Frequência entre 2 e 6 dias"),
    ),
    sexo: z.preprocess(
      (v) => normalizeSexo(v),
      z.enum(SEXOS_TREINO, { errorMap: () => ({ message: "Selecione o sexo" }) }),
    ),
    nivel: z.preprocess(
      (v) => normalizeNivel(v),
      z.enum(NIVEIS_TREINO, { errorMap: () => ({ message: "Selecione o nível" }) }),
    ),
    objetivo: z.preprocess(
      (v) => normalizeObjetivo(v),
      z.enum(OBJETIVOS_TREINO, { errorMap: () => ({ message: "Selecione o objetivo" }) }),
    ),
    limitacoes: z
      .union([z.string(), z.null()])
      .optional()
      .transform((v) => {
        if (v === null || v === undefined) return null
        const t = v.trim()
        return t === "" ? null : t
      }),
    percentual_gordura: z
      .union([z.number(), z.string(), z.null(), z.undefined()])
      .optional()
      .transform((v) => normalizeGorduraOpcional(v)),
  })

export type PerfilFieldErrors = Partial<Record<keyof PerfilTreinoInteligente | "form", string>>

export function validatePerfilPut(body: unknown):
  | { ok: true; data: PerfilTreinoInteligente }
  | { ok: false; error: string; fieldErrors: PerfilFieldErrors } {
  const parsed = perfilPutSchema.safeParse(coercePerfilBody(body))
  if (parsed.success) {
    return { ok: true, data: parsed.data as PerfilTreinoInteligente }
  }

  const fieldErrors: PerfilFieldErrors = {}
  for (const issue of parsed.error.issues) {
    const key = issue.path[0]
    if (typeof key === "string" && !fieldErrors[key as keyof PerfilFieldErrors]) {
      fieldErrors[key as keyof PerfilFieldErrors] = issue.message
    }
  }
  const first = parsed.error.issues[0]?.message ?? "Dados do perfil inválidos"
  return { ok: false, error: first, fieldErrors }
}

/** Validação no cliente (mesmas regras do servidor). */
export function validatePerfilClient(perfil: PerfilTreinoInteligente): {
  ok: boolean
  fieldErrors: PerfilFieldErrors
  message?: string
} {
  const result = validatePerfilPut(perfil)
  if (result.ok) return { ok: true, fieldErrors: {} }
  return { ok: false, fieldErrors: result.fieldErrors, message: result.error }
}

/** Normaliza chaves legadas (peso/altura) no body da API. */
export function coercePerfilBody(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {}
  }
  const b = raw as Record<string, unknown>
  return {
    peso_kg: b.peso_kg ?? b.peso,
    altura_cm: b.altura_cm ?? b.altura,
    idade: b.idade,
    frequencia_semanal: b.frequencia_semanal ?? b.frequencia,
    sexo: b.sexo,
    nivel: b.nivel,
    objetivo: b.objetivo,
    limitacoes: b.limitacoes,
    percentual_gordura: b.percentual_gordura ?? b.gordura,
  }
}

/** Evita DOMException do Safari/Radix em inputs number e Select. */
export function formatNumeroInput(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return ""
  return String(value)
}

/** Erro estruturado com erros por campo (API ou cliente). */
export class PerfilSaveError extends Error {
  fieldErrors: PerfilFieldErrors

  constructor(message: string, fieldErrors: PerfilFieldErrors = {}) {
    super(message)
    this.name = "PerfilSaveError"
    this.fieldErrors = fieldErrors
  }
}

const SAFARI_PATTERN =
  /did not match the expected pattern|string did not match/i

export function friendlyFetchError(e: unknown): string {
  if (e instanceof PerfilSaveError) {
    return e.message
  }
  const msg =
    e instanceof Error
      ? e.message
      : typeof e === "object" && e !== null && "message" in e
        ? String((e as { message: unknown }).message)
        : "Erro ao salvar"

  if (SAFARI_PATTERN.test(msg)) {
    return "Verifique peso, altura, idade e frequência (apenas números válidos)."
  }
  if (/failed to fetch|network|load failed/i.test(msg)) {
    return "Sem conexão. Tente novamente."
  }
  return msg || "Erro ao salvar"
}
