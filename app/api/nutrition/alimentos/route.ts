import { NextResponse } from "next/server"
import { requireStaff } from "@/lib/api/require-auth"
import { insertRow, query } from "@/lib/db"

type AlimentoRow = {
  id: number
  nome: string
  kcal_100g: number
  proteinas_100g: number
  carbos_100g: number
  gorduras_100g: number
}

function missingTable(e: unknown) {
  const code = typeof e === "object" && e !== null ? (e as { code?: string }).code : undefined
  return code === "ER_NO_SUCH_TABLE"
}

export async function GET(req: Request) {
  const auth = await requireStaff(req)
  if (!auth.ok) return auth.response

  const { searchParams } = new URL(req.url)
  const q = (searchParams.get("query") ?? "").trim()

  try {
    const like = q ? `%${q}%` : "%"
    const rows = await query<AlimentoRow>(
      `SELECT id, nome, kcal_100g, proteinas_100g, carbos_100g, gorduras_100g
       FROM alimentos
       WHERE academia_id = ? AND nome LIKE ?
       ORDER BY nome ASC
       LIMIT 20`,
      [auth.session.academiaId, like],
    )
    return NextResponse.json(rows)
  } catch (e) {
    console.error("GET /api/nutrition/alimentos", e)
    if (missingTable(e)) {
      return NextResponse.json(
        { error: "Tabela alimentos inexistente. Execute npm run db:bootstrap ou data/migrate_alimentos.sql." },
        { status: 503 },
      )
    }
    return NextResponse.json({ error: "Não foi possível listar alimentos." }, { status: 500 })
  }
}

type PostBody = {
  nome?: string
  kcal_100g?: number
  proteinas_100g?: number
  carbos_100g?: number
  gorduras_100g?: number
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

  const nome = typeof body.nome === "string" ? body.nome.trim() : ""
  if (!nome) return NextResponse.json({ error: "nome é obrigatório." }, { status: 400 })

  const kcal = Number(body.kcal_100g)
  if (!Number.isFinite(kcal) || kcal < 0) {
    return NextResponse.json({ error: "kcal_100g inválido." }, { status: 400 })
  }

  const p = Number(body.proteinas_100g ?? 0)
  const c = Number(body.carbos_100g ?? 0)
  const g = Number(body.gorduras_100g ?? 0)
  for (const [k, v] of [
    ["proteinas_100g", p],
    ["carbos_100g", c],
    ["gorduras_100g", g],
  ] as const) {
    if (!Number.isFinite(v) || v < 0) return NextResponse.json({ error: `${k} inválido.` }, { status: 400 })
  }

  try {
    const existing = await query<{ id: number }>(
      "SELECT id FROM alimentos WHERE academia_id = ? AND nome = ? LIMIT 1",
      [auth.session.academiaId, nome],
    )
    if (existing.length) {
      return NextResponse.json({ error: "Já existe um alimento com esse nome." }, { status: 409 })
    }

    const id = await insertRow(
      "INSERT INTO alimentos (academia_id, nome, kcal_100g, proteinas_100g, carbos_100g, gorduras_100g) VALUES (?, ?, ?, ?, ?, ?)",
      [auth.session.academiaId, nome, Math.round(kcal), p, c, g],
    )
    const rows = await query<AlimentoRow>(
      "SELECT id, nome, kcal_100g, proteinas_100g, carbos_100g, gorduras_100g FROM alimentos WHERE id = ? LIMIT 1",
      [id],
    )
    return NextResponse.json(rows[0] ?? { id, nome, kcal_100g: Math.round(kcal), proteinas_100g: p, carbos_100g: c, gorduras_100g: g }, { status: 201 })
  } catch (e) {
    console.error("POST /api/nutrition/alimentos", e)
    if (missingTable(e)) {
      return NextResponse.json(
        { error: "Tabela alimentos inexistente. Execute npm run db:bootstrap ou data/migrate_alimentos.sql." },
        { status: 503 },
      )
    }
    return NextResponse.json({ error: "Não foi possível criar o alimento." }, { status: 500 })
  }
}

