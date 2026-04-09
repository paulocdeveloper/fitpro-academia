import { NextResponse } from "next/server"
import { requireStaff } from "@/lib/api/require-auth"
import { execute, query } from "@/lib/db"
import {
  clampMacro,
  parseRefeicoesFromBody,
  parseRefeicoesJsonString,
  type StoredRefeicao,
} from "@/lib/dietas-serialize"

type DietaRow = {
  id: number
  academia_id: number
  aluno_id: number | null
  titulo: string
  aluno_nome: string | null
  objetivo: string | null
  proteinas: number
  carbos: number
  gorduras: number
  refeicoes_json: string
}

function mapRow(row: DietaRow) {
  return {
    id: row.id,
    titulo: row.titulo,
    alunoId: row.aluno_id,
    alunoNome: row.aluno_nome,
    objetivo: row.objetivo,
    proteinas: row.proteinas,
    carbos: row.carbos,
    gorduras: row.gorduras,
    refeicoes: parseRefeicoesJsonString(row.refeicoes_json),
  }
}

type RouteContext = { params: Promise<{ id: string }> }

type PatchBody = {
  titulo?: string
  aluno_id?: number | null
  aluno_nome?: string | null
  objetivo?: string | null
  proteinas?: number
  carbos?: number
  gorduras?: number
  refeicoes?: unknown
}

export async function PATCH(req: Request, ctx: RouteContext) {
  const auth = await requireStaff(req)
  if (!auth.ok) return auth.response

  const { id: idStr } = await ctx.params
  const id = Number(idStr)
  if (!Number.isFinite(id) || id < 1) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 })
  }

  let body: PatchBody
  try {
    body = (await req.json()) as PatchBody
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 })
  }

  const existing = await query<DietaRow>(
    `SELECT id, academia_id, aluno_id, titulo, aluno_nome, objetivo, proteinas, carbos, gorduras, refeicoes_json
     FROM dietas WHERE id = ? AND academia_id = ? LIMIT 1`,
    [id, auth.session.academiaId],
  )
  const row0 = existing[0]
  if (!row0) {
    return NextResponse.json({ error: "Dieta não encontrada." }, { status: 404 })
  }

  let titulo = row0.titulo
  if (body.titulo !== undefined) {
    const t = typeof body.titulo === "string" ? body.titulo.trim() : ""
    if (!t) {
      return NextResponse.json({ error: "Título não pode ser vazio." }, { status: 400 })
    }
    titulo = t
  }

  let alunoId = row0.aluno_id
  if (body.aluno_id !== undefined) {
    if (body.aluno_id === null || body.aluno_id === "") {
      alunoId = null
    } else {
      const aid = Number(body.aluno_id)
      if (!Number.isFinite(aid) || aid < 1) {
        return NextResponse.json({ error: "aluno_id inválido." }, { status: 400 })
      }
      const alunos = await query<{ id: number }>(
        "SELECT id FROM alunos WHERE id = ? AND academia_id = ? LIMIT 1",
        [aid, auth.session.academiaId],
      )
      if (!alunos.length) {
        return NextResponse.json({ error: "Aluno não encontrado nesta academia." }, { status: 403 })
      }
      alunoId = aid
    }
  }

  let alunoNome = row0.aluno_nome
  if (body.aluno_nome !== undefined) {
    alunoNome =
      typeof body.aluno_nome === "string" && body.aluno_nome.trim() ? body.aluno_nome.trim() : null
  }

  let objetivo = row0.objetivo
  if (body.objetivo !== undefined) {
    objetivo =
      typeof body.objetivo === "string" && body.objetivo.trim() ? body.objetivo.trim() : null
  }

  let proteinas = row0.proteinas
  let carbos = row0.carbos
  let gorduras = row0.gorduras
  if (body.proteinas !== undefined) proteinas = clampMacro(body.proteinas, row0.proteinas)
  if (body.carbos !== undefined) carbos = clampMacro(body.carbos, row0.carbos)
  if (body.gorduras !== undefined) gorduras = clampMacro(body.gorduras, row0.gorduras)

  let refeicoesJson = row0.refeicoes_json
  if (body.refeicoes !== undefined) {
    const parsed: StoredRefeicao[] = parseRefeicoesFromBody(body.refeicoes)
    refeicoesJson = JSON.stringify(parsed)
  }

  try {
    await execute(
      `UPDATE dietas SET titulo = ?, aluno_id = ?, aluno_nome = ?, objetivo = ?, proteinas = ?, carbos = ?, gorduras = ?, refeicoes_json = ?
       WHERE id = ? AND academia_id = ?`,
      [titulo, alunoId, alunoNome, objetivo, proteinas, carbos, gorduras, refeicoesJson, id, auth.session.academiaId],
    )

    const rows = await query<DietaRow>(
      `SELECT id, academia_id, aluno_id, titulo, aluno_nome, objetivo, proteinas, carbos, gorduras, refeicoes_json
       FROM dietas WHERE id = ? AND academia_id = ? LIMIT 1`,
      [id, auth.session.academiaId],
    )
    const row = rows[0]
    if (!row) {
      return NextResponse.json({ error: "Dieta atualizada mas não foi possível recarregar." }, { status: 200 })
    }
    return NextResponse.json(mapRow(row))
  } catch (e) {
    console.error("PATCH /api/dietas/[id]", e)
    return NextResponse.json({ error: "Não foi possível atualizar a dieta." }, { status: 500 })
  }
}
