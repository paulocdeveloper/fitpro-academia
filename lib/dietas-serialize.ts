export type StoredAlimento = { item: string; qtd: string; kcal: number }
export type StoredRefeicao = {
  id: string
  tipo: string
  horario: string
  iconKey: string
  alimentos: StoredAlimento[]
}

const ICON_KEYS = new Set(["coffee", "sun", "apple", "moon", "utensils"])

function isAlimento(x: unknown): x is StoredAlimento {
  if (!x || typeof x !== "object") return false
  const o = x as Record<string, unknown>
  return typeof o.item === "string" && typeof o.qtd === "string" && typeof o.kcal === "number" && Number.isFinite(o.kcal)
}

function normalizeRefeicao(x: unknown): StoredRefeicao | null {
  if (!x || typeof x !== "object") return null
  const o = x as Record<string, unknown>
  const id = typeof o.id === "string" && o.id.trim() ? o.id : null
  const tipo = typeof o.tipo === "string" ? o.tipo : ""
  const horario = typeof o.horario === "string" ? o.horario : "08:00"
  const iconKey = typeof o.iconKey === "string" && ICON_KEYS.has(o.iconKey) ? o.iconKey : "utensils"
  const rawAl = o.alimentos
  const alimentos = Array.isArray(rawAl) ? rawAl.map((a) => (isAlimento(a) ? a : null)).filter(Boolean) as StoredAlimento[] : []
  if (!id || !tipo.trim()) return null
  return { id, tipo, horario, iconKey, alimentos }
}

export function parseRefeicoesFromBody(raw: unknown): StoredRefeicao[] {
  if (!Array.isArray(raw)) return []
  return raw.map(normalizeRefeicao).filter(Boolean) as StoredRefeicao[]
}

export function parseRefeicoesJsonString(json: string | null | undefined): StoredRefeicao[] {
  if (!json || typeof json !== "string") return []
  try {
    const v = JSON.parse(json) as unknown
    return parseRefeicoesFromBody(v)
  } catch {
    return []
  }
}

export function clampMacro(n: unknown, fallback: number): number {
  const x = typeof n === "number" ? n : Number(n)
  if (!Number.isFinite(x) || x < 0) return fallback
  return Math.min(Math.floor(x), 99999)
}
