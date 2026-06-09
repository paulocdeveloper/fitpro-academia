import { NextResponse } from "next/server"
import { updateUserPassword } from "@/lib/auth/password-reset"
import { verifyPasswordResetCode } from "@/lib/auth/password-reset-token"

type Body = {
  resetToken?: string
  code?: string
  password?: string
  passwordConfirm?: string
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body
    const resetToken = typeof body.resetToken === "string" ? body.resetToken.trim() : ""
    const code = typeof body.code === "string" ? body.code.replace(/\D/g, "") : ""
    const password = typeof body.password === "string" ? body.password : ""
    const passwordConfirm =
      typeof body.passwordConfirm === "string" ? body.passwordConfirm : password

    if (!resetToken || code.length !== 6) {
      return NextResponse.json({ error: "Sessão de recuperação inválida." }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "A nova senha deve ter pelo menos 6 caracteres." },
        { status: 400 },
      )
    }

    if (password !== passwordConfirm) {
      return NextResponse.json({ error: "As senhas não coincidem." }, { status: 400 })
    }

    const result = await verifyPasswordResetCode(resetToken, code)

    if (!result.valid) {
      if (result.reason === "expired") {
        return NextResponse.json(
          { error: "Código expirado. Solicite um novo código.", code: "EXPIRED" },
          { status: 410 },
        )
      }
      return NextResponse.json(
        { error: "Código inválido. Verifique e tente novamente.", code: "INVALID" },
        { status: 400 },
      )
    }

    await updateUserPassword(result.userId, password)

    return NextResponse.json({
      ok: true,
      message: "Senha alterada com sucesso! Faça login com a nova senha.",
    })
  } catch (e) {
    console.error("POST /api/auth/forgot-password/reset", e)
    return NextResponse.json({ error: "Não foi possível alterar a senha." }, { status: 500 })
  }
}
