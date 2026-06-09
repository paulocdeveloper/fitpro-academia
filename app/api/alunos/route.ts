import { NextResponse } from "next/server"
import { requireStaff } from "@/lib/api/require-auth"
import { insertRow, query } from "@/lib/db"
import { quoteIdent } from "@/lib/db-dialect"
import { getAlunosColumns } from "@/lib/alunos-schema"

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

const INSERTABLE_FIELDS = [
  "nome",
  "email",
  "telefone",
  "objetivo",
  "plano",
  "status",
  "peso",
  "altura",
] as const

function toNullableString(v: unknown): string | null {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  return s === "" ? null : s
}

function toNullableNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null
  const n = typeof v === "number" ? v : Number(String(v).replace(",", "."))
  return Number.isFinite(n) ? n : null
}

function normalizeStatus(v: unknown): string | null {
  const s = toNullableString(v)?.toLowerCase() ?? null
  if (!s) return null
  if (s === "ativo" || s === "inativo" || s === "pendente") return s
  return null
}

export async function GET(req: Request) {
  const auth = await requireStaff(req)
  if (!auth.ok) return auth.response

  try {
    const availableColumns = await getAlunosColumns()

    if (!availableColumns.has("academia_id")) {
      return NextResponse.json(
        { error: "Multi-tenant: execute data/migrate_saas_multitenant.sql (coluna alunos.academia_id)." },
        { status: 503 },
      )
    }

    const optionalFields = ["objetivo", "plano", "status", "peso", "altura"]
      .map((field) => (availableColumns.has(field) ? field : `NULL AS ${field}`))
      .join(", ")

    const rows = await query<AlunoRow>(
      `SELECT id, nome, email, telefone, ${optionalFields} FROM alunos WHERE academia_id = ?`,
      [auth.session.academiaId],
    )
    return NextResponse.json(rows)
  } catch (err) {
    console.error("Erro ao buscar alunos", err)
    return NextResponse.json({ error: "Erro ao buscar alunos" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const auth = await requireStaff(req)
  if (!auth.ok) return auth.response

  try {
    const body = (await req.json()) as Record<string, unknown>
    const nome = typeof body.nome === "string" ? body.nome.trim() : ""
    if (!nome) {
      return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 })
    }

    const availableColumns = await getAlunosColumns()

    if (!availableColumns.has("academia_id")) {
      return NextResponse.json(
        { error: "Multi-tenant: execute data/migrate_saas_multitenant.sql (coluna alunos.academia_id)." },
        { status: 503 },
      )
    }

    const valuesByField: Record<string, unknown> = {
      nome,
      email: toNullableString(body.email),
      telefone: toNullableString(body.telefone),
      objetivo: toNullableString(body.objetivo),
      plano: toNullableString(body.plano),
      status: normalizeStatus(body.status),
      peso: toNullableNumber(body.peso),
      altura: toNullableNumber(body.altura),
    }

    const sqlFields: string[] = []
    const sqlParams: unknown[] = []
    sqlFields.push(quoteIdent("academia_id"))
    sqlParams.push(auth.session.academiaId)

    for (const f of INSERTABLE_FIELDS) {
      if (!availableColumns.has(f.toLowerCase())) continue
      sqlFields.push(quoteIdent(f))
      sqlParams.push(valuesByField[f])
    }

    if (sqlFields.length < 2 || !availableColumns.has("nome")) {
      return NextResponse.json(
        { error: "Tabela alunos incompatível (coluna nome ausente)" },
        { status: 500 },
      )
    }

    const sql = `INSERT INTO alunos (${sqlFields.join(", ")}) VALUES (${sqlFields.map(() => "?").join(", ")})`
    const id = await insertRow(sql, sqlParams)

    return NextResponse.json({ id, nome, message: "Aluno criado com sucesso" })
  } catch (err) {
    console.error("Erro ao criar aluno", err)
    return NextResponse.json({ error: "Erro ao criar aluno" }, { status: 500 })
  }
}
