import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { withTransaction } from "@/lib/db"
import { dbBool } from "@/lib/db-bool"
import { isDuplicateEntry } from "@/lib/db-errors"
import { signAccessToken } from "@/lib/auth/jwt"
import { perfilToRole } from "@/lib/auth/roles"
import { AUTH_COOKIE } from "@/lib/auth/session"

type RegistroBody = {
  nomeAcademia?: string
  nomeAdmin?: string
  email?: string
  password?: string
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RegistroBody
    const nomeAcademia = typeof body.nomeAcademia === "string" ? body.nomeAcademia.trim() : ""
    const nomeAdmin = typeof body.nomeAdmin === "string" ? body.nomeAdmin.trim() : ""
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
    const password = typeof body.password === "string" ? body.password : ""

    if (!nomeAcademia || nomeAcademia.length < 2) {
      return NextResponse.json({ error: "Nome da academia é obrigatório (mín. 2 caracteres)." }, { status: 400 })
    }
    if (!nomeAdmin || nomeAdmin.length < 2) {
      return NextResponse.json({ error: "Seu nome é obrigatório." }, { status: 400 })
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "E-mail inválido." }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Senha deve ter pelo menos 6 caracteres." }, { status: 400 })
    }

    const hash = await bcrypt.hash(password, 10)

    const { academiaId, userId } = await withTransaction(async (tx) => {
      const academiaId = await tx.insertRow("INSERT INTO academias (nome) VALUES (?)", [nomeAcademia])
      if (!Number.isFinite(academiaId) || academiaId < 1) {
        throw new Error("Falha ao criar academia")
      }

      try {
        const userId = await tx.insertRow(
          "INSERT INTO usuarios (nome, email, senha_hash, perfil, ativo, academia_id) VALUES (?, ?, ?, 'admin', ?, ?)",
          [nomeAdmin, email, hash, dbBool(true), academiaId],
        )
        return { academiaId, userId }
      } catch (e: unknown) {
        if (isDuplicateEntry(e)) {
          const err = new Error("DUPLICATE_EMAIL")
          ;(err as Error & { code: string }).code = "DUPLICATE_EMAIL"
          throw err
        }
        throw e
      }
    })

    const token = await signAccessToken({
      userId,
      role: perfilToRole("admin"),
      email,
      academiaId,
    })

    const res = NextResponse.json({
      ok: true,
      user: { id: userId, email, role: perfilToRole("admin"), academiaId },
      academia: { id: academiaId, nome: nomeAcademia },
    })
    res.cookies.set(AUTH_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    })
    return res
  } catch (e: unknown) {
    if ((e as Error)?.message === "DUPLICATE_EMAIL" || (e as { code?: string }).code === "DUPLICATE_EMAIL") {
      return NextResponse.json({ error: "Este e-mail já está registado." }, { status: 409 })
    }
    console.error("POST /api/academias/registro", e)
    const msg = e instanceof Error ? e.message : ""
    if (msg.includes("academia_id") || msg.includes("academias")) {
      return NextResponse.json(
        {
          error:
            "Base desatualizada. Execute data/migrate_saas_multitenant.sql ou npm run db:bootstrap numa base nova.",
        },
        { status: 503 },
      )
    }
    return NextResponse.json({ error: "Não foi possível criar a academia." }, { status: 500 })
  }
}
