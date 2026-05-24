import { NextResponse } from "next/server"
import { requireStaff } from "@/lib/api/require-auth"
import { execute, query } from "@/lib/db"

type RouteContext = { params: Promise<{ id: string }> }

function parseValor(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v) && v > 0) {
    return Math.round(v * 100) / 100
  }
  let s = String(v ?? "").trim().replace(/[^\d,.-]/g, "")
  if (!s) return null
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".")
  const n = Number.parseFloat(s)
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round(n * 100) / 100
}

export async function PATCH(req: Request, ctx: RouteContext) {
  const auth = await requireStaff(req)
  if (!auth.ok) return auth.response

  const params = await ctx.params
  const id = Number(params.id)
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 })
  }

  let body: { valor?: unknown }
  try {
    body = (await req.json()) as { valor?: unknown }
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 })
  }

  const valor = parseValor(body.valor)
  if (valor == null) {
    return NextResponse.json({ error: "Informe um valor válido maior que zero." }, { status: 400 })
  }

  try {
    const rows = await query<{ id: number; nome: string; valor: number }>(
      "SELECT id, nome, valor FROM planos_academia WHERE id = ? AND academia_id = ? LIMIT 1",
      [id, auth.session.academiaId],
    )
    const plano = rows[0]
    if (!plano) {
      return NextResponse.json({ error: "Plano não encontrado." }, { status: 404 })
    }

    const affected = await execute("UPDATE planos_academia SET valor = ? WHERE id = ? AND academia_id = ?", [
      valor,
      id,
      auth.session.academiaId,
    ])
    if (!affected) {
      return NextResponse.json({ error: "Não foi possível atualizar o plano." }, { status: 500 })
    }

    return NextResponse.json({
      id,
      nome: plano.nome,
      valor,
      message: "Valor atualizado com sucesso.",
    })
  } catch (err) {
    console.error("PATCH /api/planos/[id]", err)
    return NextResponse.json({ error: "Erro ao atualizar plano." }, { status: 500 })
  }
}
