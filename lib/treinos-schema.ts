import { query } from "@/lib/db"

export type TreinosColumnMap = {
  /** Nome real da tabela no MySQL (ex.: Treinos em Linux). */
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
  return `\`${String(ident).replace(/`/g, "")}\``
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
  const db = process.env.DB_DATABASE?.trim()
  if (!db) {
    throw new Error('Defina DB_DATABASE no .env (nome da base MySQL onde está a tabela treinos).')
  }
  return db
}

/**
 * Lê as colunas reais de `treinos` e mapeia para o que a API espera.
 * Usa DB_DATABASE (não DATABASE()) para bater certo com o pool em lib/db.ts.
 */
export async function getTreinosColumnMap(): Promise<TreinosColumnMap> {
  const db = schemaName()

  const tables = await query<{ TABLE_NAME: string }>(
    `SELECT TABLE_NAME FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = ? AND LOWER(TABLE_NAME) = 'treinos' LIMIT 1`,
    [db],
  )
  const tableName = tables[0]?.TABLE_NAME
  if (!tableName) {
    throw new Error(
      `Não existe tabela "treinos" na base "${db}". Execute data/schema_treinos_rbac.sql ou data/migrate_treinos_fitpro.sql.`,
    )
  }

  /** Preferir SHOW COLUMNS (reflecte a tabela real; evita desfasamento com information_schema). */
  const rawCols = await query<Record<string, unknown>>(
    `SHOW COLUMNS FROM ${q(db)}.${q(tableName)}`,
  )
  const cols: { COLUMN_NAME: string }[] = rawCols
    .map((r) => {
      const name = r.Field ?? r.field ?? r.COLUMN_NAME
      if (typeof name === "string" && name.length > 0) return { COLUMN_NAME: name }
      const vals = Object.values(r)
      const s = vals.find((v) => typeof v === "string") as string | undefined
      return { COLUMN_NAME: s ?? "" }
    })
    .filter((c) => c.COLUMN_NAME.length > 0)

  if (cols.length === 0) {
    throw new Error(`Não foi possível ler colunas de ${db}.${tableName} (SHOW COLUMNS vazio).`)
  }

  const lowerToActual = new Map(cols.map((c) => [c.COLUMN_NAME.toLowerCase(), c.COLUMN_NAME]))

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
    const have = cols.map((c) => c.COLUMN_NAME).join(", ")
    throw new Error(
      `Tabela "${tableName}" sem colunas reconhecidas (dono + nome). Colunas: ${have}. Ver data/migrate_treinos_fitpro.sql`,
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
