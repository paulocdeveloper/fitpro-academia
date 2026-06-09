import { NextResponse } from "next/server"
import {
  findUserByEmail,
  findUserByPhone,
  generateResetCode,
} from "@/lib/auth/password-reset"
import { signPasswordResetToken, type ResetChannel } from "@/lib/auth/password-reset-token"
import { isValidPhone, maskPhone } from "@/lib/auth/phone-normalize"
import { sendPasswordResetEmail } from "@/lib/email/send-email"
import { sendPasswordResetSms } from "@/lib/sms/send-sms"

type Body = {
  email?: string
  phone?: string
  channel?: ResetChannel
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@")
  if (!domain) return "***"
  const visible = local.slice(0, Math.min(2, local.length))
  return `${visible}***@${domain}`
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body
    const channel: ResetChannel = body.channel === "sms" ? "sms" : "email"

    let user = null
    if (channel === "email") {
      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 })
      }
      user = await findUserByEmail(email)
    } else {
      const phone = typeof body.phone === "string" ? body.phone.trim() : ""
      if (!isValidPhone(phone)) {
        return NextResponse.json({ error: "Informe um telefone válido com DDD." }, { status: 400 })
      }
      user = await findUserByPhone(phone)
    }

    if (!user) {
      return NextResponse.json(
        {
          error:
            channel === "email"
              ? "Nenhuma conta encontrada com este e-mail."
              : "Nenhuma conta encontrada com este telefone. Tente com o e-mail cadastrado.",
        },
        { status: 404 },
      )
    }

    const code = generateResetCode()
    const resetToken = await signPasswordResetToken(user.id, code, channel)

    if (channel === "email") {
      const sent = await sendPasswordResetEmail(user.email, user.nome, code)
      if (!sent.ok) {
        console.error("forgot-password email", sent.error)
        return NextResponse.json(
          { error: "Não foi possível enviar o e-mail. Tente novamente em instantes." },
          { status: 503 },
        )
      }
      return NextResponse.json({
        ok: true,
        resetToken,
        channel: "email",
        message: `Código enviado para ${maskEmail(user.email)}.`,
        devHint: sent.provider === "dev-console" ? code : undefined,
      })
    }

    const phone = typeof body.phone === "string" ? body.phone : ""
    const sent = await sendPasswordResetSms(phone, code)
    if (!sent.ok) {
      console.error("forgot-password sms", sent.error)
      return NextResponse.json(
        { error: "Não foi possível enviar o SMS. Use o e-mail ou tente mais tarde." },
        { status: 503 },
      )
    }

    return NextResponse.json({
      ok: true,
      resetToken,
      channel: "sms",
      message: `Código enviado por SMS para ${maskPhone(phone)}.`,
      devHint: sent.provider === "dev-console" ? code : undefined,
    })
  } catch (e) {
    console.error("POST /api/auth/forgot-password", e)
    return NextResponse.json({ error: "Erro ao processar solicitação." }, { status: 500 })
  }
}
