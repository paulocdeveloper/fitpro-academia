type SendResult = { ok: true; provider: string } | { ok: false; error: string }

function fromAddress(): string {
  return (
    process.env.EMAIL_FROM?.trim() ||
    process.env.SMTP_FROM?.trim() ||
    process.env.RESEND_FROM?.trim() ||
    "FitPro <noreply@fitproia.com.br>"
  )
}

async function sendViaResend(to: string, subject: string, html: string): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY não configurada" }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromAddress(),
      to: [to],
      subject,
      html,
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    return { ok: false, error: `Resend ${res.status}: ${text.slice(0, 200)}` }
  }
  return { ok: true, provider: "resend" }
}

async function sendViaSmtp(to: string, subject: string, html: string): Promise<SendResult> {
  const host = process.env.SMTP_HOST?.trim()
  const user = process.env.SMTP_USER?.trim()
  const pass = process.env.SMTP_PASS?.trim()
  const port = Number(process.env.SMTP_PORT ?? "587")

  if (!host || !user || !pass) {
    return { ok: false, error: "SMTP_HOST/SMTP_USER/SMTP_PASS não configurados" }
  }

  try {
    const nodemailer = await import("nodemailer")
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    })
    await transporter.sendMail({
      from: fromAddress(),
      to,
      subject,
      html,
      text: html.replace(/<[^>]+>/g, " "),
    })
    return { ok: true, provider: "smtp" }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

function passwordResetHtml(code: string, nome: string): string {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h2 style="color:#111;margin:0 0 16px">Recuperação de senha — FitPro</h2>
      <p>Olá, ${nome}!</p>
      <p>Use o código abaixo para redefinir sua senha. Ele expira em <strong>15 minutos</strong>.</p>
      <p style="font-size:32px;font-weight:bold;letter-spacing:8px;text-align:center;padding:16px;background:#f4f4f5;border-radius:8px">${code}</p>
      <p style="color:#666;font-size:13px">Se você não solicitou, ignore este e-mail.</p>
    </div>
  `
}

export async function sendPasswordResetEmail(
  to: string,
  nome: string,
  code: string,
): Promise<SendResult> {
  const subject = "FitPro — código de recuperação de senha"
  const html = passwordResetHtml(code, nome)

  if (process.env.RESEND_API_KEY?.trim()) {
    const r = await sendViaResend(to, subject, html)
    if (r.ok) return r
    console.warn("[email] Resend falhou, tentando SMTP…", r.error)
  }

  if (process.env.SMTP_HOST?.trim()) {
    const r = await sendViaSmtp(to, subject, html)
    if (r.ok) return r
    console.warn("[email] SMTP falhou", r.error)
  }

  if (process.env.NODE_ENV !== "production") {
    console.info(`[password-reset][dev] e-mail para ${to} — código: ${code}`)
    return { ok: true, provider: "dev-console" }
  }

  return {
    ok: false,
    error: "Envio de e-mail não configurado (RESEND_API_KEY ou SMTP_*).",
  }
}
