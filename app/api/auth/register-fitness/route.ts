import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { insertRow } from "@/lib/db"
import { dbBool } from "@/lib/db-bool"
import { isDuplicateEntry } from "@/lib/db-errors"
import { ensureFitnessAcademiaId } from "@/lib/auth/resolve-academia"
import { signAccessToken } from "@/lib/auth/jwt"
import { perfilToRole } from "@/lib/auth/roles"
import { AUTH_COOKIE } from "@/lib/auth/session"

type Body = {
  nome?: string
  email?: string
  password?: string
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body
    const nome = typeof body.nome === "string" ? body.nome.trim() : ""
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
    const password = typeof body.password === "string" ? body.password : ""

    if (!nome || nome.length < 2) {
      return NextResponse.json({ error: "Informe seu nome (mín. 2 caracteres)." }, { status: 400 })
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "E-mail inválido." }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Senha deve ter pelo menos 6 caracteres." }, { status: 400 })
    }

    const academiaId = await ensureFitnessAcademiaId()
    const hash = await bcrypt.hash(password, 10)

    let userId: number
    try {
      userId = await insertRow(
        "INSERT INTO usuarios (nome, email, senha_hash, perfil, ativo, academia_id) VALUES (?, ?, ?, 'usuario', ?, ?)",
        [nome, email, hash, dbBool(true), academiaId],
      )
    } catch (e: unknown) {
      if (isDuplicateEntry(e)) {
        return NextResponse.json({ error: "Este e-mail já está registado." }, { status: 409 })
      }
      throw e
    }

    const role = perfilToRole("usuario")
    const token = await signAccessToken({
      userId,
      role,
      email,
      academiaId,
    })

    const res = NextResponse.json({
      ok: true,
      user: { id: userId, email, role, academiaId },
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
    console.error("POST /api/auth/register-fitness", e)
    return NextResponse.json({ error: "Não foi possível criar a conta." }, { status: 500 })
  }
}
