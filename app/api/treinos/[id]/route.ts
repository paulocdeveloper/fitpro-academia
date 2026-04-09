import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/api/require-auth"
import { execute } from "@/lib/db"
import { canViewAllTreinos } from "@/lib/auth/roles"
import type { UserRole } from "@/lib/auth/roles"
import { canAccessTreino, canMutateTreino } from "@/lib/auth/treinos-access"
import { usuarioPertenceAcademia } from "@/lib/usuario-academia"
import { mapTreino, parseExercicios, type TreinoRow } from "@/app/api/treinos/route"
import {
  buildTreinosDeleteSql,
  buildTreinosUpdateSet,
  buildTreinosUpdateSql,
  fetchTreinoById,
  resolveTreinosColumnMap,
} from "@/lib/treinos-schema"

type RouteContext = { params: Promise<{ id: string }> }

function getId(params: { id: string }) {
  const id = Number(params.id)
  if (!Number.isFinite(id)) return null
  return id
}

export async function GET(req: Request, ctx: RouteContext) {
  const auth = await requireAuth(req)
  if (!auth.ok) return auth.response
  const session = auth.session

  const params = await ctx.params
  const id = getId(params)
  if (id == null) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 })
  }

  try {
    const map = await resolveTreinosColumnMap()
    if (!map.academiaId) {
      return NextResponse.json(
        { error: "Multi-tenant: execute data/migrate_saas_multitenant.sql." },
        { status: 503 },
      )
    }
    const row = await fetchTreinoById(id, map, session.academiaId)
    if (!row) {
      return NextResponse.json({ error: "Treino não encontrado." }, { status: 404 })
    }
    if (!canAccessTreino(session.role as UserRole, session.userId, row.user_id)) {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 })
    }
    return NextResponse.json(mapTreino(row as TreinoRow))
  } catch (e) {
    console.error("GET /treinos/[id]", e)
    return NextResponse.json({ error: "Erro ao buscar treino." }, { status: 500 })
  }
}

type PutBody = {
  nome?: string
  categoria?: string | null
  status?: string | null
  exercicios?: unknown
  user_id?: number | null
}

export async function PUT(req: Request, ctx: RouteContext) {
  const auth = await requireAuth(req)
  if (!auth.ok) return auth.response
  const session = auth.session

  const params = await ctx.params
  const id = getId(params)
  if (id == null) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 })
  }

  let body: PutBody
  try {
    body = (await req.json()) as PutBody
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 })
  }

  try {
    const map = await resolveTreinosColumnMap()
    if (!map.academiaId) {
      return NextResponse.json(
        { error: "Multi-tenant: execute data/migrate_saas_multitenant.sql." },
        { status: 503 },
      )
    }
    const row = await fetchTreinoById(id, map, session.academiaId)
    if (!row) {
      return NextResponse.json({ error: "Treino não encontrado." }, { status: 404 })
    }
    if (!canMutateTreino(session.role as UserRole, session.userId, row.user_id)) {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 })
    }

    const nome = typeof body.nome === "string" ? body.nome.trim() : row.nome
    let userId = row.user_id
    if (canViewAllTreinos(session.role) && body.user_id != null && Number.isFinite(Number(body.user_id))) {
      userId = Number(body.user_id)
    }

    const allowed = await usuarioPertenceAcademia(userId, session.academiaId)
    if (!allowed) {
      return NextResponse.json({ error: "Utilizador não pertence à sua academia." }, { status: 403 })
    }

    const categoria =
      body.categoria !== undefined
        ? body.categoria != null
          ? String(body.categoria).trim() || null
          : null
        : row.categoria
    const status =
      typeof body.status === "string" && body.status.trim() ? body.status.trim() : row.status

    const exerciciosStr =
      body.exercicios !== undefined
        ? JSON.stringify(parseExercicios(body.exercicios))
        : typeof row.exercicios === "string"
          ? row.exercicios
          : JSON.stringify(parseExercicios(row.exercicios))

    const setSql = buildTreinosUpdateSet(map)
    const updateParams: unknown[] = [userId, nome]
    if (map.categoria) updateParams.push(categoria)
    if (map.status) updateParams.push(status)
    if (map.exercicios) updateParams.push(exerciciosStr)
    updateParams.push(id)
    if (map.academiaId) updateParams.push(session.academiaId)

    await execute(buildTreinosUpdateSql(map, setSql), updateParams)

    const updated = await fetchTreinoById(id, map, session.academiaId)
    if (!updated) {
      return NextResponse.json({ error: "Treino atualizado." }, { status: 200 })
    }
    return NextResponse.json(mapTreino(updated as TreinoRow))
  } catch (e) {
    console.error("PUT /treinos/[id]", e)
    return NextResponse.json({ error: "Erro ao atualizar treino." }, { status: 500 })
  }
}

export async function DELETE(req: Request, ctx: RouteContext) {
  const auth = await requireAuth(req)
  if (!auth.ok) return auth.response
  const session = auth.session

  const params = await ctx.params
  const id = getId(params)
  if (id == null) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 })
  }

  try {
    const map = await resolveTreinosColumnMap()
    if (!map.academiaId) {
      return NextResponse.json(
        { error: "Multi-tenant: execute data/migrate_saas_multitenant.sql." },
        { status: 503 },
      )
    }
    const row = await fetchTreinoById(id, map, session.academiaId)
    if (!row) {
      return NextResponse.json({ error: "Treino não encontrado." }, { status: 404 })
    }
    if (!canMutateTreino(session.role as UserRole, session.userId, row.user_id)) {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 })
    }

    const delParams: unknown[] = [id]
    if (map.academiaId) delParams.push(session.academiaId)
    const affected = await execute(buildTreinosDeleteSql(map), delParams)
    if (affected === 0) {
      return NextResponse.json({ error: "Treino não encontrado." }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("DELETE /treinos/[id]", e)
    return NextResponse.json({ error: "Erro ao excluir treino." }, { status: 500 })
  }
}
