import { mercadoPagoFetch } from "@/lib/mercadopago/client"
import { subscriptionBackUrls } from "@/lib/mercadopago/config"
import { PREMIUM_PLAN } from "@/lib/premium/types"

export type MpPreapprovalStatus =
  | "pending"
  | "authorized"
  | "paused"
  | "cancelled"

export type MpPreapproval = {
  id: string
  status: MpPreapprovalStatus
  reason?: string
  external_reference?: string
  payer_email?: string
  init_point?: string
  sandbox_init_point?: string
  date_created?: string
  next_payment_date?: string
  last_modified?: string
  auto_recurring?: {
    frequency?: number
    frequency_type?: string
    transaction_amount?: number
    currency_id?: string
  }
}

export function fitproExternalReference(userId: number, academiaId: number): string {
  return `fitpro:${userId}:${academiaId}`
}

export function parseFitproExternalReference(ref: string | undefined): {
  userId: number
  academiaId: number
} | null {
  if (!ref?.startsWith("fitpro:")) return null
  const parts = ref.split(":")
  const userId = Number(parts[1])
  const academiaId = Number(parts[2])
  if (!Number.isFinite(userId) || !Number.isFinite(academiaId)) return null
  return { userId, academiaId }
}

export async function createPendingPreapproval(input: {
  userId: number
  academiaId: number
  payerEmail: string
}): Promise<{ preapprovalId: string; checkoutUrl: string }> {
  const urls = subscriptionBackUrls()
  const body = {
    reason: PREMIUM_PLAN.name,
    external_reference: fitproExternalReference(input.userId, input.academiaId),
    payer_email: input.payerEmail,
    back_url: urls.back,
    status: "pending",
    auto_recurring: {
      frequency: 1,
      frequency_type: "months",
      transaction_amount: PREMIUM_PLAN.priceBrl,
      currency_id: "BRL",
    },
  }

  const created = await mercadoPagoFetch<MpPreapproval>("/preapproval", {
    method: "POST",
    body: JSON.stringify(body),
  })

  const checkoutUrl =
    created.init_point ??
    created.sandbox_init_point ??
    `https://www.mercadopago.com.br/subscriptions/checkout?preapproval_id=${created.id}`

  if (!created.id) {
    throw new Error("Mercado Pago não retornou ID da assinatura.")
  }

  return { preapprovalId: created.id, checkoutUrl }
}

export async function getPreapproval(preapprovalId: string): Promise<MpPreapproval> {
  return mercadoPagoFetch<MpPreapproval>(`/preapproval/${preapprovalId}`)
}

export async function cancelPreapproval(preapprovalId: string): Promise<MpPreapproval> {
  return mercadoPagoFetch<MpPreapproval>(`/preapproval/${preapprovalId}`, {
    method: "PUT",
    body: JSON.stringify({ status: "cancelled" }),
  })
}
