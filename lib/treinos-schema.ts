import { query } from "@/lib/db"
import { resolveDbConfig } from "@/lib/db-config"
import { quoteIdent } from "@/lib/db-dialect"

export type TreinosColumnMap = {
  /** Nome real da tabela (ex.: Treinos em Linux no MySQL). */
  tableName: string
  /** Coluna tenant (SaaS); null se ainda não migrada. */
  academiaId: string | null
  userId: string
  nome: string
  categoria: string | null
  status: string | null
  exercicios: string | null
}

export type TreinoDbRow = {
  id: number
  user_id: number
  nome: string
  categoria: string | null
  status: string
  exercicios: unknown
  aluno_nome: string | null
}

function q(ident: string) {
  return quoteIdent(ident, "postgres")
}

function firstActual(
  lowerToActual: Map<string, string>,
  candidates: string[],
): string | null {
  for (const c of candidates) {
    const a = lowerToActual.get(c.toLowerCase())
    if (a) return a
  }
  return null
}

function schemaName(): string {
  return resolveDbConfig().schema
}

/**
 * Lê as colunas reais de `treinos` e mapeia para o que a API espera.
 */
export async function getTreinosColumnMap(): Promise<TreinosColumnMap> {
  const db = schemaName()
  const tables = await query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = ? AND LOWER(table_name) = 'treinos' LIMIT 1`,
    [db],
  )
  const tableName = tables[0]?.table_name
  if (!tableName) {
    throw new Error(
      `Não existe tabela "treinos" no schema "${db}". Execute: npm run db:bootstrap`,
    )
  }

  const cols = await query<{ column_name: string }>(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = ? AND table_name = ?`,
    [db, tableName],
  )

  const lowerToActual = new Map(cols.map((c) => [c.column_name.toLowerCase(), c.column_name]))
  return buildColumnMap(tableName, lowerToActual, cols.map((c) => c.column_name))
}

function buildColumnMap(
  tableName: string,
  lowerToActual: Map<string, string>,
  colNames: string[],
): TreinosColumnMap {
  const userId =
    firstActual(lowerToActual, [
      "user_id",
      "usuario_id",
      "id_usuario",
      "aluno_id",
      "id_aluno",
      "professor_id",
      "personal_id",
      "id_personal",
    ]) ?? null
  const nome = firstActual(lowerToActual, ["nome", "titulo", "name", "descricao"]) ?? null

  if (!userId || !nome) {
    const have = colNames.join(", ")
    throw new Error(
      `Tabela "${tableName}" sem colunas reconhecidas (dono + nome). Colunas: ${have}.`,
    )
  }

  return {
    tableName,
    academiaId: firstActual(lowerToActual, ["academia_id", "id_academia", "tenant_id"]),
    userId,
    nome,
    categoria: firstActual(lowerToActual, ["categoria", "tipo", "categoria_treino"]),
    status: firstActual(lowerToActual, ["status", "situacao", "estado"]),
    exercicios: firstActual(lowerToActual, [
      "exercicios",
      "lista_exercicios",
      "detalhes",
      "conteudo",
      "json_exercicios",
    ]),
  }
}

export function buildTreinosSelectSql(m: TreinosColumnMap): string {
  const tn = q(m.tableName)
  const categoriaSql = m.categoria ? `t.${q(m.categoria)}` : "NULL"
  const statusSql = m.status ? `COALESCE(t.${q(m.status)}, 'ativo')` : `'ativo'`
  const exerciciosSql = m.exercicios ? `t.${q(m.exercicios)}` : "NULL"
  return `
    SELECT
      t.id,
      t.${q(m.userId)} AS user_id,
      t.${q(m.nome)} AS nome,
      ${categoriaSql} AS categoria,
      ${statusSql} AS status,
      ${exerciciosSql} AS exercicios,
      u.nome AS aluno_nome
    FROM ${tn} t
    LEFT JOIN usuarios u ON u.id = t.${q(m.userId)}
  `.trim()
}

/** Predicado `t.academia_id = ?` para WHERE (multi-tenant). */
export function treinosAcademiaPredicate(m: TreinosColumnMap, alias = "t"): string | null {
  if (!m.academiaId) return null
  return `${alias}.${q(m.academiaId)} = ?`
}

export async function fetchTreinoById(
  id: number,
  map: TreinosColumnMap,
  academiaId: number,
): Promise<TreinoDbRow | null> {
  const base = buildTreinosSelectSql(map)
  let sql = `${base} WHERE t.id = ?`
  const params: unknown[] = [id]
  const pred = treinosAcademiaPredicate(map, "t")
  if (pred) {
    sql += ` AND ${pred}`
    params.push(academiaId)
  }
  sql += " LIMIT 1"
  const rows = await query<TreinoDbRow>(sql, params)
  return rows[0] ?? null
}

/** Garante tabela e devolve mapa de colunas (re-tenta após CREATE IF NOT EXISTS). */
export async function resolveTreinosColumnMap(): Promise<TreinosColumnMap> {
  try {
    return await getTreinosColumnMap()
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes("Não existe tabela")) {
      const { ensureTreinosTable } = await import("@/lib/ensure-treinos-table")
      await ensureTreinosTable()
      return await getTreinosColumnMap()
    }
    throw e
  }
}

/**
 * INSERT: ordem dos `?` — [academia_id?], user_id, nome, [categoria], [status], [exercicios].
 */
export function buildTreinosInsertSql(m: TreinosColumnMap): string {
  const fields: string[] = []
  if (m.academiaId) fields.push(q(m.academiaId))
  fields.push(q(m.userId), q(m.nome))
  if (m.categoria) fields.push(q(m.categoria))
  if (m.status) fields.push(q(m.status))
  if (m.exercicios) fields.push(q(m.exercicios))
  const placeholders = fields.map(() => "?").join(", ")
  return `INSERT INTO ${q(m.tableName)} (${fields.join(", ")}) VALUES (${placeholders})`
}

/** SET do UPDATE na mesma ordem de parâmetros que o handler monta. */
export function buildTreinosUpdateSet(m: TreinosColumnMap): string {
  const set: string[] = [`${q(m.userId)} = ?`, `${q(m.nome)} = ?`]
  if (m.categoria) set.push(`${q(m.categoria)} = ?`)
  if (m.status) set.push(`${q(m.status)} = ?`)
  if (m.exercicios) set.push(`${q(m.exercicios)} = ?`)
  return set.join(", ")
}

export function buildTreinosUpdateSql(m: TreinosColumnMap, setClause: string): string {
  const tn = q(m.tableName)
  let w = "WHERE id = ?"
  if (m.academiaId) w += ` AND ${q(m.academiaId)} = ?`
  return `UPDATE ${tn} SET ${setClause} ${w}`
}

export function buildTreinosDeleteSql(m: TreinosColumnMap): string {
  const tn = q(m.tableName)
  let w = "WHERE id = ?"
  if (m.academiaId) w += ` AND ${q(m.academiaId)} = ?`
  return `DELETE FROM ${tn} ${w}`
}

/** Referência qualificada à coluna dono (para WHERE). */
export function treinosOwnerRef(m: TreinosColumnMap): string {
  return `t.${q(m.userId)}`
}

/** SELECT mínimo para RBAC antes de DELETE (inclui academia_id se existir). */
export function treinosOwnerSelectSql(m: TreinosColumnMap): string {
  const ac = m.academiaId ? `, ${q(m.academiaId)} AS academia_id` : ""
  return `SELECT ${q(m.userId)} AS user_id${ac} FROM ${q(m.tableName)} WHERE id = ? LIMIT 1`
}
