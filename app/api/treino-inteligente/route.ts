import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/api/require-auth"
import { isFitnessRole, isStaffRole } from "@/lib/auth/roles"
import { insertRow, query } from "@/lib/db"
import {
  alunoToPerfil,
  resolveAlunoForUser,
  saveAlunoPerfil,
} from "@/lib/treino-inteligente/aluno-record"
import { gerarTreinoInteligente } from "@/lib/treino-inteligente/generator"
import {
  coercePerfilBody,
  normalizePerfil,
  validatePerfilPut,
} from "@/lib/treino-inteligente/perfil-schema"
import { mapDbConnectionError } from "@/lib/db-errors"
import {
  buildTreinosInsertSql,
  buildTreinosSelectSql,
  resolveTreinosColumnMap,
  treinosAcademiaPredicate,
  treinosOwnerRef,
} from "@/lib/treinos-schema"

const CATEGORIA_INTELIGENTE = "inteligente"

async function loadTreinoInteligente(userId: number, academiaId: number) {
  const map = await resolveTreinosColumnMap()
  const base = buildTreinosSelectSql(map)
  const acPred = treinosAcademiaPredicate(map, "t")
  const owner = treinosOwnerRef(map)
  const params: unknown[] = acPred ? [academiaId, userId] : [userId]
  const sql = acPred
    ? `${base} WHERE ${acPred} AND ${owner} = ? AND t.categoria = ? ORDER BY t.id DESC LIMIT 1`
    : `${base} WHERE ${owner} = ? AND t.categoria = ? ORDER BY t.id DESC LIMIT 1`
  params.push(CATEGORIA_INTELIGENTE)
  const rows = await query<{ exercicios: string; id: number }>(sql, params)
  if (!rows[0]?.exercicios) return null
  try {
    return JSON.parse(String(rows[0].exercicios)) as ReturnType<typeof gerarTreinoInteligente>
  } catch {
    return null
  }
}

async function persistTreinoInteligente(
  userId: number,
  academiaId: number,
  payload: ReturnType<typeof gerarTreinoInteligente>,
) {
  const map = await resolveTreinosColumnMap()
  const existing = await loadTreinoInteligente(userId, academiaId)
  const json = JSON.stringify(payload)

  if (existing) {
    const acPred = treinosAcademiaPredicate(map, "t")
    const owner = treinosOwnerRef(map)
    const params: unknown[] = [json, userId]
    let sql = `UPDATE treinos SET exercicios = ?, updated_at = now() WHERE ${owner} = ? AND categoria = ?`
    params.push(CATEGORIA_INTELIGENTE)
    if (acPred) {
      sql += ` AND academia_id = ?`
      params.push(academiaId)
    }
    await query(sql, params)
  } else {
    const insertSql = buildTreinosInsertSql(map)
    const insertParams: unknown[] = [academiaId, userId, "Treino Inteligente"]
    if (map.categoria) insertParams.push(CATEGORIA_INTELIGENTE)
    if (map.status) insertParams.push("ativo")
    if (map.exercicios) insertParams.push(json)
    await insertRow(insertSql, insertParams)
  }

  await insertRow(
    `INSERT INTO treino_inteligente_historico (user_id, academia_id, imc, progresso_pct, payload)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, academiaId, payload.imc, payload.progresso_pct, json],
  ).catch(() => {
    /* tabela pode não existir ainda */
  })
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
  let treino = await loadTreinoInteligente(auth.session.userId, auth.session.academiaId)

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

  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 })
  }

  const coerced = coercePerfilBody(raw)
  console.info("[perfil-submit:api]", {
    peso_kg: coerced.peso_kg,
    altura_cm: coerced.altura_cm,
    idade: coerced.idade,
    frequencia_semanal: coerced.frequencia_semanal,
    sexo: coerced.sexo,
    objetivo: coerced.objetivo,
    percentual_gordura: coerced.percentual_gordura,
  })

  const validated = validatePerfilPut(coerced)
  if (!validated.ok) {
    console.info("[perfil-submit:api] validation-failed", validated.fieldErrors)
    return NextResponse.json(
      { error: validated.error, fieldErrors: validated.fieldErrors },
      { status: 400 },
    )
  }

  const aluno = await resolveAlunoForUser(auth.session)
  if (!aluno) return NextResponse.json({ error: "Aluno não encontrado." }, { status: 404 })

  try {
    await saveAlunoPerfil(aluno.id, validated.data)
  } catch (e) {
    const mapped = mapDbConnectionError(e)
    if (mapped) return NextResponse.json({ error: mapped.error }, { status: mapped.status })
    console.error("[treino-inteligente PUT]", e)
    return NextResponse.json({ error: "Não foi possível salvar o perfil." }, { status: 500 })
  }

  const updated = await resolveAlunoForUser(auth.session)
  const perfil = normalizePerfil(alunoToPerfil(updated!))

  const prev = await loadTreinoInteligente(auth.session.userId, auth.session.academiaId)
  const progresso = prev?.progresso_pct ?? 0
  const treino = gerarTreinoInteligente(perfil, (prev?.versao ?? 0) + 1, progresso)
  await persistTreinoInteligente(auth.session.userId, auth.session.academiaId, treino)

  return NextResponse.json({ ok: true, perfil, treino })
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

  const aluno = await resolveAlunoForUser(auth.session)
  if (!aluno) return NextResponse.json({ error: "Aluno não encontrado." }, { status: 404 })

  const perfil = alunoToPerfil(aluno)
  const prev = await loadTreinoInteligente(auth.session.userId, auth.session.academiaId)
  const treino = gerarTreinoInteligente(perfil, (prev?.versao ?? 0) + 1, prev?.progresso_pct ?? 0)
  await persistTreinoInteligente(auth.session.userId, auth.session.academiaId, treino)

  return NextResponse.json({ ok: true, treino })
}
