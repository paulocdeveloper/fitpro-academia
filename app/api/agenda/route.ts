import { NextResponse } from "next/server"
import { requireAuth, requireStaff } from "@/lib/api/require-auth"
import { isStaffRole } from "@/lib/auth/roles"
import { insertRow, query, tableExists } from "@/lib/db"
import { resolveAlunoForUser } from "@/lib/treino-inteligente/aluno-record"

export type TipoEventoAgenda = "treino" | "avaliacao" | "nutricao"

type EventoRow = {
  id: number
  data_evento: Date | string
  horario: string
  tipo: TipoEventoAgenda
  aluno_nome: string
  aluno_id: number | null
  duracao: number
  observacoes: string | null
}

const TIPOS: TipoEventoAgenda[] = ["treino", "avaliacao", "nutricao"]

function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function parseISODate(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim())
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  if (d.getFullYear() !== Number(m[1]) || d.getMonth() !== Number(m[2]) - 1 || d.getDate() !== Number(m[3])) {
    return null
  }
  return d
}

function rowDataISO(v: Date | string): string {
  if (v instanceof Date) return toISODate(v)
  const s = String(v).slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : toISODate(new Date(v))
}

function normalizeHorario(v: unknown): string | null {
  const s = String(v ?? "").trim()
  if (!/^\d{1,2}:\d{2}$/.test(s)) return null
  const [h, min] = s.split(":").map(Number)
  if (h < 0 || h > 23 || min < 0 || min > 59) return null
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`
}

function mapEvento(r: EventoRow) {
  return {
    id: r.id,
    data: rowDataISO(r.data_evento),
    horario: r.horario,
    tipo: r.tipo,
    aluno: r.aluno_nome,
    alunoId: r.aluno_id,
    duracao: Number(r.duracao) || 60,
    observacoes: r.observacoes,
  }
}

export async function GET(req: Request) {
  const auth = await requireAuth(req)
  if (!auth.ok) return auth.response

  const url = new URL(req.url)
  const inicioParam = url.searchParams.get("inicio")?.trim()
  const inicio = inicioParam ? parseISODate(inicioParam) : null
  if (inicioParam && !inicio) {
    return NextResponse.json({ error: "Parâmetro inicio inválido (use AAAA-MM-DD)." }, { status: 400 })
  }

  const start = inicio ?? (() => {
    const h = new Date()
    h.setHours(0, 0, 0, 0)
    h.setDate(h.getDate() - h.getDay())
    return h
  })()

  const fim = new Date(start)
  fim.setDate(start.getDate() + 6)
  const inicioISO = toISODate(start)
  const fimISO = toISODate(fim)

  try {
    if (!(await tableExists("agenda_eventos"))) {
      return NextResponse.json(
        {
          error:
            "Tabela agenda_eventos ausente. MySQL: npm run db:bootstrap. Supabase: execute data/supabase_fitpro_schema.sql.",
        },
        { status: 503 },
      )
    }

    const staff = isStaffRole(auth.session.role)
    let rows: EventoRow[]

    if (staff) {
      rows = await query<EventoRow>(
        `SELECT id, data_evento, horario, tipo, aluno_nome, aluno_id, duracao, observacoes
         FROM agenda_eventos
         WHERE academia_id = ? AND data_evento >= ? AND data_evento <= ?
         ORDER BY data_evento ASC, horario ASC`,
        [auth.session.academiaId, inicioISO, fimISO],
      )
    } else {
      const aluno = await resolveAlunoForUser(auth.session)
      if (!aluno) {
        return NextResponse.json({ inicio: inicioISO, fim: fimISO, eventos: [] })
      }
      rows = await query<EventoRow>(
        `SELECT id, data_evento, horario, tipo, aluno_nome, aluno_id, duracao, observacoes
         FROM agenda_eventos
         WHERE academia_id = ? AND data_evento >= ? AND data_evento <= ?
           AND (aluno_id = ? OR LOWER(aluno_nome) = LOWER(?))
         ORDER BY data_evento ASC, horario ASC`,
        [auth.session.academiaId, inicioISO, fimISO, aluno.id, aluno.nome],
      )
    }

    return NextResponse.json({
      inicio: inicioISO,
      fim: fimISO,
      eventos: rows.map(mapEvento),
    })
  } catch (err) {
    console.error("GET /api/agenda", err)
    return NextResponse.json({ error: "Erro ao buscar agenda." }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const auth = await requireStaff(req)
  if (!auth.ok) return auth.response

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 })
  }

  const dataStr = typeof body.data === "string" ? body.data.trim() : ""
  const data = parseISODate(dataStr)
  if (!data) {
    return NextResponse.json({ error: "Informe uma data válida." }, { status: 400 })
  }

  const horario = normalizeHorario(body.horario)
  if (!horario) {
    return NextResponse.json({ error: "Informe um horário válido (ex.: 09:00)." }, { status: 400 })
  }

  const tipo = String(body.tipo ?? "").toLowerCase() as TipoEventoAgenda
  if (!TIPOS.includes(tipo)) {
    return NextResponse.json({ error: "Tipo de evento inválido." }, { status: 400 })
  }

  const alunoNome =
    typeof body.aluno === "string"
      ? body.aluno.trim()
      : typeof body.aluno_nome === "string"
        ? body.aluno_nome.trim()
        : ""
  if (!alunoNome) {
    return NextResponse.json({ error: "Informe o nome do aluno." }, { status: 400 })
  }

  let duracao = typeof body.duracao === "number" ? body.duracao : Number(String(body.duracao ?? "60"))
  if (!Number.isFinite(duracao) || duracao < 15) duracao = 60
  if (duracao > 480) duracao = 480

  const alunoIdRaw = body.aluno_id ?? body.alunoId
  const alunoId =
    alunoIdRaw === null || alunoIdRaw === undefined || alunoIdRaw === ""
      ? null
      : Number(alunoIdRaw)
  const alunoIdFinal = Number.isFinite(alunoId) && alunoId! > 0 ? alunoId : null

  const observacoes =
    typeof body.observacoes === "string" && body.observacoes.trim() ? body.observacoes.trim() : null

  try {
    const id = await insertRow(
      `INSERT INTO agenda_eventos
        (academia_id, data_evento, horario, tipo, aluno_nome, aluno_id, duracao, observacoes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [auth.session.academiaId, dataStr, horario, tipo, alunoNome, alunoIdFinal, duracao, observacoes],
    )

    return NextResponse.json({
      id,
      data: dataStr,
      horario,
      tipo,
      aluno: alunoNome,
      alunoId: alunoIdFinal,
      duracao,
      observacoes,
      message: "Evento criado com sucesso.",
    })
  } catch (err) {
    console.error("POST /api/agenda", err)
    return NextResponse.json({ error: "Erro ao criar evento." }, { status: 500 })
  }
}
