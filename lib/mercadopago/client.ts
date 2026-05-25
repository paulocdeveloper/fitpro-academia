import { getMercadoPagoAccessToken, mercadoPagoApiBase } from "@/lib/mercadopago/config"

export class MercadoPagoApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body: unknown,
  ) {
    super(message)
    this.name = "MercadoPagoApiError"
  }
}

export async function mercadoPagoFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = getMercadoPagoAccessToken()
  if (!token) {
    throw new MercadoPagoApiError("MERCADOPAGO_ACCESS_TOKEN não configurado.", 503, null)
  }

  const res = await fetch(`${mercadoPagoApiBase()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  })

  const text = await res.text()
  let body: unknown = null
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = text
    }
  }

  if (!res.ok) {
    const msg =
      typeof body === "object" && body && "message" in body
        ? String((body as { message: unknown }).message)
        : `Mercado Pago HTTP ${res.status}`
    throw new MercadoPagoApiError(msg, res.status, body)
  }

  return body as T
}
