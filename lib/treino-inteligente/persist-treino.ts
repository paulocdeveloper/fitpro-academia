import { insertRow, query } from "@/lib/db"
import { quoteIdent } from "@/lib/db-dialect"
import type { TreinoInteligenteGerado } from "@/lib/treino-inteligente/generator"
import {
  buildTreinosInsertSql,
  buildTreinosSelectSql,
  resolveTreinosColumnMap,
  treinosAcademiaPredicate,
  treinosOwnerColumn,
  treinosOwnerRef,
  type TreinosColumnMap,
} from "@/lib/treinos-schema"

const CATEGORIA_INTELIGENTE = "inteligente"

async function loadTreinoInteligente(
  userId: number,
  academiaId: number,
  map: TreinosColumnMap,
) {
  const base = buildTreinosSelectSql(map)
  const acPred = treinosAcademiaPredicate(map, "t")
  const owner = treinosOwnerRef(map)
  const params: unknown[] = acPred ? [academiaId, userId] : [userId]
  const sql = acPred
    ? `${base} WHERE ${acPred} AND ${owner} = ? AND t.${quoteIdent(map.categoria!, "postgres")} = ? ORDER BY t.id DESC LIMIT 1`
    : `${base} WHERE ${owner} = ? AND t.${quoteIdent(map.categoria!, "postgres")} = ? ORDER BY t.id DESC LIMIT 1`
  params.push(CATEGORIA_INTELIGENTE)
  if (!map.categoria) return null
  const rows = await query<{ exercicios: string; id: number }>(sql, params)
  if (!rows[0]?.exercicios) return null
  try {
    return JSON.parse(String(rows[0].exercicios)) as TreinoInteligenteGerado
  } catch {
    return null
  }
}

export async function persistTreinoInteligente(
  userId: number,
  academiaId: number,
  payload: TreinoInteligenteGerado,
): Promise<void> {
  const map = await resolveTreinosColumnMap()
  if (!map.exercicios) {
    throw new Error('Tabela treinos sem coluna "exercicios". Execute npm run db:bootstrap')
  }

  const tn = quoteIdent(map.tableName, "postgres")
  const ownerCol = treinosOwnerColumn(map)
  const exerciciosCol = quoteIdent(map.exercicios, "postgres")
  const json = JSON.stringify(payload)

  const existing = map.categoria
    ? await loadTreinoInteligente(userId, academiaId, map)
    : null

  if (existing) {
    const params: unknown[] = [json, userId]
    let where = `WHERE ${ownerCol} = ?`
    if (map.categoria) {
      where += ` AND ${quoteIdent(map.categoria, "postgres")} = ?`
      params.push(CATEGORIA_INTELIGENTE)
    }
    if (map.academiaId) {
      where += ` AND ${quoteIdent(map.academiaId, "postgres")} = ?`
      params.push(academiaId)
    }
    await query(`UPDATE ${tn} SET ${exerciciosCol} = ? ${where}`, params)
  } else {
    const insertSql = buildTreinosInsertSql(map)
    const insertParams: unknown[] = []
    if (map.academiaId) insertParams.push(academiaId)
    insertParams.push(userId, "Treino Inteligente")
    if (map.categoria) insertParams.push(CATEGORIA_INTELIGENTE)
    if (map.status) insertParams.push("ativo")
    if (map.exercicios) insertParams.push(json)
    await insertRow(insertSql, insertParams)
  }

  await insertRow(
    `INSERT INTO treino_inteligente_historico (user_id, academia_id, imc, progresso_pct, payload)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, academiaId, payload.imc, payload.progresso_pct, json],
  ).catch((e) => {
    console.warn("[persist-treino] historico skip:", e instanceof Error ? e.message : e)
  })
}

export async function fetchTreinoInteligenteGerado(
  userId: number,
  academiaId: number,
): Promise<TreinoInteligenteGerado | null> {
  const map = await resolveTreinosColumnMap()
  if (!map.categoria) return null
  return loadTreinoInteligente(userId, academiaId, map)
}
