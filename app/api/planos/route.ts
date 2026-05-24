import { NextResponse } from "next/server"
import { requireStaff } from "@/lib/api/require-auth"
import { PLANOS_META } from "@/lib/planos-meta"
import { insertRow, query, tableExists } from "@/lib/db"
import { dbBool } from "@/lib/db-bool"

type PlanoRow = {
  id: number
  slug: string
  nome: string
  valor: number
  duracao: string
  descricao: string | null
  destaque: number
}

type AlunoCountRow = {
  plano: string | null
  total: number
}

function toNumber(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

async function ensurePlanosSeed(academiaId: number) {
  const existing = await query<{ slug: string }>(
    "SELECT slug FROM planos_academia WHERE academia_id = ?",
    [academiaId],
  )
  const have = new Set(existing.map((r) => r.slug))
  for (const meta of PLANOS_META) {
    if (have.has(meta.slug)) continue
    await insertRow(
      `INSERT INTO planos_academia (academia_id, slug, nome, valor, duracao, descricao, destaque)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        academiaId,
        meta.slug,
        meta.nome,
        meta.valorPadrao,
        meta.duracao,
        meta.descricao,
        meta.destaque ? dbBool(true) : dbBool(false),
      ],
    )
  }
}

export async function GET(req: Request) {
  const auth = await requireStaff(req)
  if (!auth.ok) return auth.response

  try {
    if (!(await tableExists("planos_academia"))) {
      return NextResponse.json(
        {
          error:
            "Tabela planos_academia ausente. MySQL: npm run db:bootstrap. Supabase: execute data/supabase_fitpro_schema.sql.",
        },
        { status: 503 },
      )
    }

    await ensurePlanosSeed(auth.session.academiaId)

    const rows = await query<PlanoRow>(
      `SELECT id, slug, nome, valor, duracao, descricao, destaque
       FROM planos_academia WHERE academia_id = ? ORDER BY id ASC`,
      [auth.session.academiaId],
    )

    const counts = await query<AlunoCountRow>(
      `SELECT plano, COUNT(*) AS total FROM alunos
       WHERE academia_id = ? AND LOWER(COALESCE(status, '')) = 'ativo'
       GROUP BY plano`,
      [auth.session.academiaId],
    )
    const alunosPorNome = new Map<string, number>()
    for (const c of counts) {
      const key = (c.plano ?? "").trim().toLowerCase()
      if (key) alunosPorNome.set(key, toNumber(c.total))
    }

    const planos = rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      nome: r.nome,
      valor: toNumber(r.valor),
      duracao: r.duracao,
      descricao: r.descricao,
      destaque: Boolean(r.destaque),
      alunos: alunosPorNome.get(r.nome.trim().toLowerCase()) ?? 0,
    }))

    return NextResponse.json(planos)
  } catch (err) {
    console.error("GET /api/planos", err)
    return NextResponse.json({ error: "Erro ao buscar planos" }, { status: 500 })
  }
}

/** Garante registos padrão (útil após deploy sem visitar GET). */
export async function POST(req: Request) {
  const auth = await requireStaff(req)
  if (!auth.ok) return auth.response

  try {
    await ensurePlanosSeed(auth.session.academiaId)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("POST /api/planos", err)
    return NextResponse.json({ error: "Erro ao inicializar planos" }, { status: 500 })
  }
}
