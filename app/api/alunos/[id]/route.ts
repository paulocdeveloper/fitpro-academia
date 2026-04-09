import { NextResponse } from "next/server"
import { requireStaff } from "@/lib/api/require-auth"
import { execute, query } from "@/lib/db"

type AlunoRow = {
  id: number
  nome: string
  email: string | null
  telefone: string | null
  objetivo: string | null
  plano: string | null
  status: string | null
  peso: number | null
  altura: number | null
}

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(req: Request, ctx: RouteContext) {
  const auth = await requireStaff(req)
  if (!auth.ok) return auth.response

  const { id: idStr } = await ctx.params
  const id = Number(idStr)
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 })
  }

  try {
    const columns = await query<{ COLUMN_NAME: string }>(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'alunos'`,
    )
    const availableColumns = new Set(columns.map((c) => c.COLUMN_NAME))

    if (!availableColumns.has("academia_id")) {
      return NextResponse.json(
        { error: "Multi-tenant: execute data/migrate_saas_multitenant.sql." },
        { status: 503 },
      )
    }

    const optionalFields = ["objetivo", "plano", "status", "peso", "altura"]
      .map((field) => (availableColumns.has(field) ? field : `NULL AS ${field}`))
      .join(", ")

    const rows = await query<AlunoRow>(
      `SELECT id, nome, email, telefone, ${optionalFields} FROM alunos WHERE id = ? AND academia_id = ? LIMIT 1`,
      [id, auth.session.academiaId],
    )

    if (!rows.length) {
      return NextResponse.json({ error: "Aluno não encontrado" }, { status: 404 })
    }

    return NextResponse.json(rows[0])
  } catch (err) {
    console.error("Erro ao buscar aluno", err)
    return NextResponse.json({ error: "Erro ao buscar aluno" }, { status: 500 })
  }
}

export async function DELETE(req: Request, ctx: RouteContext) {
  const auth = await requireStaff(req)
  if (!auth.ok) return auth.response

  const { id: idStr } = await ctx.params
  const id = Number(idStr)
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 })
  }

  try {
    const cols = await query<{ COLUMN_NAME: string }>(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'alunos'`,
    )
    const hasAcad = cols.some((c) => c.COLUMN_NAME === "academia_id")
    if (!hasAcad) {
      return NextResponse.json(
        { error: "Multi-tenant: execute data/migrate_saas_multitenant.sql." },
        { status: 503 },
      )
    }

    const affected = await execute(`DELETE FROM alunos WHERE id = ? AND academia_id = ?`, [
      id,
      auth.session.academiaId,
    ])
    if (affected === 0) {
      return NextResponse.json({ error: "Aluno não encontrado" }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("Erro ao excluir aluno", err)
    return NextResponse.json({ error: "Erro ao excluir aluno" }, { status: 500 })
  }
}
