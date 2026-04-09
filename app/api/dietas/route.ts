import { NextResponse } from "next/server"
import { requireStaff } from "@/lib/api/require-auth"
import { insertRow, query } from "@/lib/db"
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

function missingTable(e: unknown) {
  const code = typeof e === "object" && e !== null ? (e as { code?: string }).code : undefined
  return code === "ER_NO_SUCH_TABLE"
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

export async function GET(req: Request) {
  const auth = await requireStaff(req)
  if (!auth.ok) return auth.response

  try {
    const rows = await query<DietaRow>(
      `SELECT id, academia_id, aluno_id, titulo, aluno_nome, objetivo, proteinas, carbos, gorduras, refeicoes_json
       FROM dietas WHERE academia_id = ? ORDER BY id DESC`,
      [auth.session.academiaId],
    )
    return NextResponse.json(rows.map(mapRow))
  } catch (e) {
    console.error("GET /api/dietas", e)
    if (missingTable(e)) {
      return NextResponse.json(
        {
          error: "Tabela dietas inexistente. Execute npm run db:bootstrap ou aplique data/migrate_dietas.sql.",
        },
        { status: 503 },
      )
    }
    return NextResponse.json({ error: "Não foi possível listar as dietas." }, { status: 500 })
  }
}

type PostBody = {
  titulo?: string
  aluno_id?: number | null
  aluno_nome?: string | null
  objetivo?: string | null
  proteinas?: number
  carbos?: number
  gorduras?: number
  refeicoes?: unknown
}

export async function POST(req: Request) {
  const auth = await requireStaff(req)
  if (!auth.ok) return auth.response

  let body: PostBody
  try {
    body = (await req.json()) as PostBody
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 })
  }

  const titulo = typeof body.titulo === "string" ? body.titulo.trim() : ""
  if (!titulo) {
    return NextResponse.json({ error: "Título da dieta é obrigatório." }, { status: 400 })
  }

  let alunoId: number | null = null
  if (body.aluno_id != null && body.aluno_id !== "") {
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

  const alunoNome =
    typeof body.aluno_nome === "string" && body.aluno_nome.trim() ? body.aluno_nome.trim() : null
  const objetivo =
    typeof body.objetivo === "string" && body.objetivo.trim() ? body.objetivo.trim() : null

  const proteinas = clampMacro(body.proteinas, 0)
  const carbos = clampMacro(body.carbos, 0)
  const gorduras = clampMacro(body.gorduras, 0)

  let refeicoes: StoredRefeicao[] = parseRefeicoesFromBody(body.refeicoes)
  if (refeicoes.length === 0) {
    refeicoes = []
  }

  try {
    const newId = await insertRow(
      `INSERT INTO dietas (academia_id, aluno_id, titulo, aluno_nome, objetivo, proteinas, carbos, gorduras, refeicoes_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        auth.session.academiaId,
        alunoId,
        titulo,
        alunoNome,
        objetivo,
        proteinas,
        carbos,
        gorduras,
        JSON.stringify(refeicoes),
      ],
    )

    const rows = await query<DietaRow>(
      `SELECT id, academia_id, aluno_id, titulo, aluno_nome, objetivo, proteinas, carbos, gorduras, refeicoes_json
       FROM dietas WHERE id = ? AND academia_id = ? LIMIT 1`,
      [newId, auth.session.academiaId],
    )
    const row = rows[0]
    if (!row) {
      return NextResponse.json({ error: "Dieta criada mas não foi possível recarregar." }, { status: 201 })
    }
    return NextResponse.json(mapRow(row), { status: 201 })
  } catch (e) {
    console.error("POST /api/dietas", e)
    if (missingTable(e)) {
      return NextResponse.json(
        {
          error: "Tabela dietas inexistente. Execute npm run db:bootstrap ou aplique data/migrate_dietas.sql.",
        },
        { status: 503 },
      )
    }
    return NextResponse.json({ error: "Não foi possível criar a dieta." }, { status: 500 })
  }
}
