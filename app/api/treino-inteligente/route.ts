import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/api/require-auth"
import { isFitnessRole, isStaffRole } from "@/lib/auth/roles"
import { query } from "@/lib/db"
import { mapDbConnectionError } from "@/lib/db-errors"
import {
  alunoToPerfil,
  resolveAlunoForUser,
  saveAlunoPerfil,
} from "@/lib/treino-inteligente/aluno-record"
import { gerarTreinoInteligente } from "@/lib/treino-inteligente/generator"
import {
  fetchTreinoInteligenteGerado,
  persistTreinoInteligente,
} from "@/lib/treino-inteligente/persist-treino"
import {
  coercePerfilBody,
  normalizePerfil,
  validatePerfilPut,
} from "@/lib/treino-inteligente/perfil-schema"

function logPut(step: string, data: Record<string, unknown>) {
  console.info(`[treino-inteligente:PUT:${step}]`, data)
}

function formatPutError(e: unknown): { status: number; error: string; detail?: string } {
  const mapped = mapDbConnectionError(e)
  if (mapped) return mapped

  const msg = e instanceof Error ? e.message : String(e)
  const code = typeof e === "object" && e !== null ? (e as { code?: string }).code : undefined

  if (code === "42703" || /column.*does not exist/i.test(msg)) {
    return {
      status: 503,
      error: "Banco desatualizado. Execute npm run db:bootstrap no servidor.",
    }
  }

  return {
    status: 500,
    error: "Não foi possível salvar o perfil. Tente novamente.",
    detail: process.env.NODE_ENV === "production" ? undefined : msg,
  }
}

export async function GET(req: Request) {
  const auth = await requireAuth(req)
  if (!auth.ok) return auth.response

  if (isStaffRole(auth.session.role)) {
    return NextResponse.json({ error: "Use /treinos para gestão manual." }, { status: 403 })
  }
  if (!isFitnessRole(auth.session.role)) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 })
  }

  const aluno = await resolveAlunoForUser(auth.session)
  if (!aluno) {
    return NextResponse.json({ error: "Perfil de aluno não encontrado." }, { status: 404 })
  }

  const perfil = normalizePerfil(alunoToPerfil(aluno))
  let treino = await fetchTreinoInteligenteGerado(auth.session.userId, auth.session.academiaId)

  if (!treino) {
    treino = gerarTreinoInteligente(perfil, 1, 0)
    await persistTreinoInteligente(auth.session.userId, auth.session.academiaId, treino)
  }

  const historico = await query<{ created_at: string; progresso_pct: number; imc: number }>(
    `SELECT created_at, progresso_pct, imc FROM treino_inteligente_historico
     WHERE user_id = ? AND academia_id = ? ORDER BY id DESC LIMIT 12`,
    [auth.session.userId, auth.session.academiaId],
  ).catch(() => [])

  return NextResponse.json({
    ok: true,
    aluno: { id: aluno.id, nome: aluno.nome },
    perfil,
    treino,
    historico,
  })
}

export async function PUT(req: Request) {
  const auth = await requireAuth(req)
  if (!auth.ok) return auth.response
  if (isStaffRole(auth.session.role)) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 })
  }
  if (!isFitnessRole(auth.session.role)) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 })
  }

  const sessionCtx = {
    userId: auth.session.userId,
    role: auth.session.role,
    academiaId: auth.session.academiaId,
    email: auth.session.email ?? null,
  }

  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 })
  }

  logPut("body", { ...sessionCtx, body: coercePerfilBody(raw) })

  const coerced = coercePerfilBody(raw)
  const validated = validatePerfilPut(coerced)
  if (!validated.ok) {
    logPut("validation-failed", { fieldErrors: validated.fieldErrors })
    return NextResponse.json(
      { error: validated.error, fieldErrors: validated.fieldErrors },
      { status: 400 },
    )
  }

  logPut("payload", { ...sessionCtx, payload: validated.data })

  try {
    const aluno = await resolveAlunoForUser(auth.session)
    if (!aluno) {
      logPut("aluno-not-found", sessionCtx)
      return NextResponse.json({ error: "Aluno não encontrado." }, { status: 404 })
    }

    logPut("aluno", { alunoId: aluno.id, nome: aluno.nome })

    await saveAlunoPerfil(aluno.id, validated.data)
    logPut("perfil-saved", { alunoId: aluno.id })

    const updated = await resolveAlunoForUser(auth.session)
    if (!updated) {
      return NextResponse.json({ error: "Perfil salvo mas não foi possível recarregar." }, { status: 500 })
    }

    const perfil = normalizePerfil(alunoToPerfil(updated))
    const prev = await fetchTreinoInteligenteGerado(auth.session.userId, auth.session.academiaId)
    const progresso = prev?.progresso_pct ?? 0
    const treino = gerarTreinoInteligente(perfil, (prev?.versao ?? 0) + 1, progresso)

    logPut("treino-generated", { versao: treino.versao, dias: treino.dias.length })

    await persistTreinoInteligente(auth.session.userId, auth.session.academiaId, treino)
    logPut("ok", { alunoId: aluno.id, versao: treino.versao })

    return NextResponse.json({ ok: true, perfil, treino })
  } catch (e) {
    const formatted = formatPutError(e)
    console.error("[treino-inteligente:PUT:error]", {
      ...sessionCtx,
      message: e instanceof Error ? e.message : String(e),
      stack: e instanceof Error ? e.stack : undefined,
      pgCode: typeof e === "object" && e !== null ? (e as { code?: string }).code : undefined,
    })
    return NextResponse.json(
      { error: formatted.error, detail: formatted.detail },
      { status: formatted.status },
    )
  }
}

export async function POST(req: Request) {
  const auth = await requireAuth(req)
  if (!auth.ok) return auth.response
  if (isStaffRole(auth.session.role)) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 })
  }
  if (!isFitnessRole(auth.session.role)) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 })
  }

  try {
    const aluno = await resolveAlunoForUser(auth.session)
    if (!aluno) return NextResponse.json({ error: "Aluno não encontrado." }, { status: 404 })

    const perfil = alunoToPerfil(aluno)
    const prev = await fetchTreinoInteligenteGerado(auth.session.userId, auth.session.academiaId)
    const treino = gerarTreinoInteligente(perfil, (prev?.versao ?? 0) + 1, prev?.progresso_pct ?? 0)
    await persistTreinoInteligente(auth.session.userId, auth.session.academiaId, treino)

    return NextResponse.json({ ok: true, treino })
  } catch (e) {
    const formatted = formatPutError(e)
    console.error("[treino-inteligente:POST:error]", e)
    return NextResponse.json({ error: formatted.error }, { status: formatted.status })
  }
}
