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

  const gordura = parseNumeroCampo(src.percentual_gordura)
  const percentual_gordura =
    gordura === undefined ? null : Math.round(gordura * 10) / 10

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
      .union([z.number(), z.string(), z.null()])
      .optional()
      .transform((v) => {
        const n = parseNumeroCampo(v)
        if (n === undefined) return null
        return Math.round(n * 10) / 10
      })
      .refine((v) => v === null || (v >= 3 && v <= 60), {
        message: "% de gordura inválido (use 3 a 60 ou deixe vazio)",
      }),
  })

export type PerfilFieldErrors = Partial<Record<keyof PerfilTreinoInteligente | "form", string>>

export function validatePerfilPut(body: unknown):
  | { ok: true; data: PerfilTreinoInteligente }
  | { ok: false; error: string; fieldErrors: PerfilFieldErrors } {
  const parsed = perfilPutSchema.safeParse(body)
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

export type PerfilFormStrings = {
  pesoStr: string
  alturaStr: string
  idadeStr: string
  freqStr: string
  gorduraStr: string
}

/** Monta payload numérico a partir dos campos de texto (Safari-safe). */
export function buildPerfilSubmitPayload(
  strings: PerfilFormStrings,
  base: PerfilTreinoInteligente,
): PerfilTreinoInteligente {
  const peso = parseNumeroCampo(strings.pesoStr)
  const altura = parseNumeroCampo(strings.alturaStr)
  const idade = parseNumeroCampo(strings.idadeStr)
  const freq = parseNumeroCampo(strings.freqStr)
  const gorduraRaw = strings.gorduraStr.trim()
  const gordura = gorduraRaw ? parseNumeroCampo(strings.gorduraStr) : null

  return normalizePerfil({
    ...base,
    peso_kg: peso ?? base.peso_kg,
    altura_cm: altura ?? base.altura_cm,
    idade: idade ?? base.idade,
    frequencia_semanal: freq ?? base.frequencia_semanal,
    percentual_gordura: gordura === undefined ? null : gordura,
    limitacoes: base.limitacoes?.trim() ? base.limitacoes.trim() : null,
  })
}

/** Evita DOMException do Safari/Radix em inputs number e Select. */
export function formatNumeroInput(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return ""
  return String(value)
}

/** Lê JSON sem usar res.json() — no Safari/iOS isso pode lançar "did not match the expected pattern". */
export async function parseJsonResponse<T>(res: Response): Promise<T> {
  const text = await res.text()
  if (!text.trim()) {
    throw new Error(res.ok ? "Resposta vazia do servidor." : `Erro ${res.status} ao salvar.`)
  }
  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error(
      res.ok ? "Resposta inválida do servidor." : `Erro ${res.status} ao salvar. Tente novamente.`,
    )
  }
}

const SAFARI_PATTERN_RE = /did not match the expected pattern/i

export function friendlyFetchError(e: unknown): string {
  const msg = e instanceof Error ? e.message : "Erro ao salvar"
  if (SAFARI_PATTERN_RE.test(msg)) {
    return "Verifique peso, altura, idade e frequência (apenas números válidos)."
  }
  if (/failed to fetch|network|load failed/i.test(msg)) {
    return "Sem conexão. Tente novamente."
  }
  return msg
}

/** Logs temporários de diagnóstico (remover após validar em produção). */
export function logPerfilSubmit(
  stage: string,
  payload: unknown,
  extra?: Record<string, unknown>,
): void {
  if (typeof console === "undefined") return
  console.info("[perfil-treino]", stage, payload, extra ?? "")
}
