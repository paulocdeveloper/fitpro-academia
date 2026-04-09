import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/api/require-auth"
import { insertRow, query } from "@/lib/db"
import { usuarioPertenceAcademia } from "@/lib/usuario-academia"
import { canViewAllTreinos } from "@/lib/auth/roles"
import type { UserRole } from "@/lib/auth/roles"
import {
  buildTreinosInsertSql,
  buildTreinosSelectSql,
  fetchTreinoById,
  resolveTreinosColumnMap,
  treinosAcademiaPredicate,
  treinosOwnerRef,
} from "@/lib/treinos-schema"

function sqlExceptionDetails(e: unknown): string | undefined {
  if (e instanceof Error) return e.message
  const sqlMsg = (e as { sqlMessage?: string })?.sqlMessage
  if (typeof sqlMsg === "string" && sqlMsg) return sqlMsg
  return undefined
}

function treinosListErrorPayload(e: unknown) {
  const hint =
    "Confirme DB_DATABASE no .env ou execute data/migrate_saas_multitenant.sql / data/schema_treinos_rbac.sql."
  const tech = sqlExceptionDetails(e)
  return {
    error: "Não foi possível listar os treinos.",
    details: tech ? `${tech} ${hint}` : hint,
  }
}

export type TreinoRow = {
  id: number
  user_id: number
  nome: string
  categoria: string | null
  status: string
  exercicios: unknown
  aluno_nome: string | null
}

export function parseExercicios(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw
  if (raw == null) return []
  if (typeof raw === "string") {
    try {
      const j = JSON.parse(raw)
      return Array.isArray(j) ? j : []
    } catch {
      return []
    }
  }
  return []
}

export function mapTreino(r: TreinoRow) {
  return {
    id: r.id,
    user_id: r.user_id,
    nome: r.nome,
    categoria: r.categoria,
    status: r.status,
    exercicios: parseExercicios(r.exercicios),
    aluno: r.aluno_nome ?? "",
  }
}

export async function GET(req: Request) {
  const auth = await requireAuth(req)
  if (!auth.ok) return auth.response
  const session = auth.session

  try {
    const map = await resolveTreinosColumnMap()
    if (!map.academiaId) {
      return NextResponse.json(
        { error: "Multi-tenant: execute data/migrate_saas_multitenant.sql (coluna treinos.academia_id)." },
        { status: 503 },
      )
    }
    const base = buildTreinosSelectSql(map)
    const staff = canViewAllTreinos(session.role)
    const owner = treinosOwnerRef(map)
    const acPred = treinosAcademiaPredicate(map, "t")

    let sql: string
    const params: unknown[] = []

    if (staff) {
      if (acPred) {
        sql = `${base} WHERE ${acPred} ORDER BY t.id DESC`
        params.push(session.academiaId)
      } else {
        sql = `${base} ORDER BY t.id DESC`
      }
    } else if (acPred) {
      sql = `${base} WHERE ${acPred} AND ${owner} = ? ORDER BY t.id DESC`
      params.push(session.academiaId, session.userId)
    } else {
      sql = `${base} WHERE ${owner} = ? ORDER BY t.id DESC`
      params.push(session.userId)
    }

    const rows = await query<TreinoRow>(sql, params)
    return NextResponse.json(rows.map(mapTreino))
  } catch (e) {
    console.error("GET /treinos", e)
    return NextResponse.json(treinosListErrorPayload(e), { status: 500 })
  }
}

type PostBody = {
  nome?: string
  categoria?: string | null
  status?: string | null
  exercicios?: unknown
  user_id?: number | null
}

export async function POST(req: Request) {
  const auth = await requireAuth(req)
  if (!auth.ok) return auth.response
  const session = auth.session

  let body: PostBody
  try {
    body = (await req.json()) as PostBody
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 })
  }

  const nome = typeof body.nome === "string" ? body.nome.trim() : ""
  if (!nome) {
    return NextResponse.json({ error: "Nome do treino é obrigatório." }, { status: 400 })
  }

  let ownerId = session.userId
  const role = session.role as UserRole
  if (canViewAllTreinos(role)) {
    if (body.user_id != null && Number.isFinite(Number(body.user_id))) {
      ownerId = Number(body.user_id)
    }
  }

  const inTenant = await usuarioPertenceAcademia(ownerId, session.academiaId)
  if (!inTenant) {
    return NextResponse.json({ error: "Utilizador não pertence à sua academia." }, { status: 403 })
  }

  const categoria = body.categoria != null ? String(body.categoria).trim() || null : null
  const status = typeof body.status === "string" && body.status.trim() ? body.status.trim() : "ativo"
  const exerciciosJson = JSON.stringify(parseExercicios(body.exercicios))

  try {
    const map = await resolveTreinosColumnMap()
    if (map.academiaId == null) {
      return NextResponse.json(
        {
          error: "Base sem coluna academia_id em treinos. Execute data/migrate_saas_multitenant.sql.",
        },
        { status: 503 },
      )
    }

    const insertSql = buildTreinosInsertSql(map)
    const insertParams: unknown[] = [session.academiaId, ownerId, nome]
    if (map.categoria) insertParams.push(categoria)
    if (map.status) insertParams.push(status)
    if (map.exercicios) insertParams.push(exerciciosJson)

    const insertId = await insertRow(insertSql, insertParams)

    const row = await fetchTreinoById(insertId, map, session.academiaId)
    if (!row) {
      return NextResponse.json({ error: "Treino criado mas não foi possível recarregar." }, { status: 201 })
    }
    return NextResponse.json(mapTreino(row), { status: 201 })
  } catch (e) {
    console.error("POST /treinos", e)
    const tech = sqlExceptionDetails(e)
    return NextResponse.json(
      {
        error: "Não foi possível criar o treino.",
        details: tech ?? "Confira user_id, colunas da tabela e o .env.",
      },
      { status: 500 },
    )
  }
}
