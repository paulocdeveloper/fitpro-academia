type SendResult = { ok: true; provider: string } | { ok: false; error: string }

function maskDestination(phone: string): string {
  const d = phone.replace(/\D/g, "")
  if (d.length < 4) return "****"
  return `***${d.slice(-4)}`
}

/**
 * Envio de SMS — estrutura preparada para Twilio (ou similar).
 * Em dev, loga no console.
 */
export async function sendPasswordResetSms(phone: string, code: string): Promise<SendResult> {
  const to = phone.replace(/\D/g, "")
  const body = `FitPro: seu código de recuperação é ${code}. Válido por 15 minutos.`

  const sid = process.env.TWILIO_ACCOUNT_SID?.trim()
  const token = process.env.TWILIO_AUTH_TOKEN?.trim()
  const from = process.env.TWILIO_FROM?.trim()

  if (sid && token && from) {
    const auth = Buffer.from(`${sid}:${token}`).toString("base64")
    const params = new URLSearchParams({ To: `+55${to.startsWith("55") ? to.slice(2) : to}`, From: from, Body: body })
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      },
    )
    if (!res.ok) {
      const text = await res.text().catch(() => "")
      return { ok: false, error: `Twilio ${res.status}: ${text.slice(0, 200)}` }
    }
    return { ok: true, provider: "twilio" }
  }

  if (process.env.NODE_ENV !== "production") {
    console.info(`[password-reset][dev] SMS para ${maskDestination(phone)} — código: ${code}`)
    return { ok: true, provider: "dev-console" }
  }

  return {
    ok: false,
    error: "SMS não configurado (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM).",
  }
}
