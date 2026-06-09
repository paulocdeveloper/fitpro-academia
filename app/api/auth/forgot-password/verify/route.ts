import { NextResponse } from "next/server"
import { verifyPasswordResetCode } from "@/lib/auth/password-reset-token"

type Body = {
  resetToken?: string
  code?: string
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body
    const resetToken = typeof body.resetToken === "string" ? body.resetToken.trim() : ""
    const code = typeof body.code === "string" ? body.code.replace(/\D/g, "") : ""

    if (!resetToken || code.length !== 6) {
      return NextResponse.json({ error: "Informe o código de 6 dígitos." }, { status: 400 })
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

    return NextResponse.json({
      ok: true,
      message: "Código confirmado. Defina sua nova senha.",
      resetToken,
    })
  } catch (e) {
    console.error("POST /api/auth/forgot-password/verify", e)
    return NextResponse.json({ error: "Erro ao validar código." }, { status: 500 })
  }
}
