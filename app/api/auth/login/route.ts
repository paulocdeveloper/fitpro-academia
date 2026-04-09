import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { query } from "@/lib/db"
import { ensureUserAcademiaId } from "@/lib/auth/resolve-academia"
import { signAccessToken } from "@/lib/auth/jwt"
import { perfilToRole } from "@/lib/auth/roles"
import { AUTH_COOKIE } from "@/lib/auth/session"

type UsuarioRow = {
  id: number
  email: string
  senha_hash: string
  perfil: string | null
  ativo: number | null
  academia_id: number | null
}

function mapDbError(e: unknown): { status: number; error: string } | null {
  if (!e || typeof e !== "object") return null
  const err = e as { code?: string; message?: string }
  const code = err.code
  const msg = typeof err.message === "string" ? err.message : ""

  if (code === "ECONNREFUSED" || code === "ENOTFOUND") {
    return {
      status: 503,
      error:
        "Não foi possível ligar ao MySQL. Confirme que o servidor está ligado e que DB_HOST e DB_PORT no .env estão corretos.",
    }
  }
  if (code === "ER_ACCESS_DENIED_ERROR") {
    return {
      status: 503,
      error:
        "MySQL recusou o acesso. Verifique DB_USER e DB_PASSWORD no .env (devem ser os mesmos dados com que entra no HeidiSQL/phpMyAdmin).",
    }
  }
  if (code === "ER_BAD_DB_ERROR" || /unknown database/i.test(msg)) {
    return {
      status: 503,
      error:
        "A base de dados não existe. Crie a base ou ajuste DB_DATABASE no .env e execute: npm run db:bootstrap",
    }
  }
  if (code === "ER_NO_SUCH_TABLE") {
    return {
      status: 503,
      error: "Tabelas em falta na base. Execute: npm run db:bootstrap",
    }
  }
  if (code === "ER_BAD_FIELD_ERROR") {
    return {
      status: 503,
      error:
        "Falta coluna SaaS na base (ex.: usuarios.academia_id). No terminal: npm run db:fix-saas  ou  npm run db:bootstrap",
    }
  }
  return null
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { email?: string; password?: string }
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
    const password = typeof body.password === "string" ? body.password : ""
    if (!email || !password) {
      return NextResponse.json({ error: "E-mail e senha são obrigatórios." }, { status: 400 })
    }

    let user: UsuarioRow | undefined
    let hasAcademiaColumn = true
    try {
      const rows = await query<UsuarioRow>(
        `SELECT id, email, senha_hash, perfil, ativo, academia_id FROM usuarios WHERE LOWER(email) = ? LIMIT 1`,
        [email],
      )
      user = rows[0]
    } catch (selErr) {
      const c = typeof selErr === "object" && selErr !== null ? (selErr as { code?: string }).code : ""
      if (c !== "ER_BAD_FIELD_ERROR") throw selErr
      hasAcademiaColumn = false
      const rows = await query<{
        id: number
        email: string
        senha_hash: string
        perfil: string | null
        ativo: number | null
      }>(
        `SELECT id, email, senha_hash, perfil, ativo FROM usuarios WHERE LOWER(email) = ? LIMIT 1`,
        [email],
      )
      const u = rows[0]
      user = u ? { ...u, academia_id: null } : undefined
    }

    if (!user) {
      return NextResponse.json({ error: "Credenciais inválidas." }, { status: 401 })
    }
    if (user.ativo != null && Number(user.ativo) === 0) {
      return NextResponse.json({ error: "Usuário inativo." }, { status: 403 })
    }

    const hash = user.senha_hash
    if (typeof hash !== "string" || !hash.startsWith("$2")) {
      console.error("login: senha_hash ausente ou não é bcrypt para user id", user.id)
      return NextResponse.json(
        {
          error:
            "Conta com formato de senha inválido na base. No terminal do projeto execute: npm run db:seed-master",
        },
        { status: 503 },
      )
    }

    let ok = false
    try {
      ok = await bcrypt.compare(password, hash)
    } catch (bcErr) {
      console.error("login bcrypt", bcErr)
      return NextResponse.json(
        {
          error:
            "Não foi possível validar a senha (hash corrompido). Execute: npm run db:seed-master",
        },
        { status: 503 },
      )
    }
    if (!ok) {
      return NextResponse.json({ error: "Credenciais inválidas." }, { status: 401 })
    }

    if (!hasAcademiaColumn) {
      return NextResponse.json(
        {
          error:
            "A base ainda não tem a coluna usuarios.academia_id. No terminal (Ubuntu/WSL): npm run db:fix-saas",
        },
        { status: 503 },
      )
    }

    let academiaId = user.academia_id != null ? Number(user.academia_id) : NaN
    if (!Number.isFinite(academiaId) || academiaId < 1) {
      try {
        academiaId = await ensureUserAcademiaId(user.id)
      } catch (fixErr) {
        console.error("login ensureUserAcademiaId", fixErr)
        return NextResponse.json(
          {
            error:
              "Não foi possível associar a conta a uma academia. Execute: npm run db:fix-saas && npm run db:seed-master",
          },
          { status: 503 },
        )
      }
    }

    const role = perfilToRole(user.perfil)
    const token = await signAccessToken({
      userId: user.id,
      role,
      email: user.email,
      academiaId,
    })

    const res = NextResponse.json({
      ok: true,
      user: { id: user.id, email: user.email, role, academiaId },
    })
    res.cookies.set(AUTH_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    })
    return res
  } catch (e) {
    console.error("login", e)
    const mapped = mapDbError(e)
    if (mapped) {
      return NextResponse.json({ error: mapped.error }, { status: mapped.status })
    }
    const hint =
      process.env.NODE_ENV === "development"
        ? (e instanceof Error ? ` Detalhe: ${e.message}` : "")
        : ""
    return NextResponse.json({ error: `Erro ao autenticar.${hint}` }, { status: 500 })
  }
}
