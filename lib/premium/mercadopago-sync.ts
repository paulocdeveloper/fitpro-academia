import { query } from "@/lib/db"
import { isMercadoPagoConfigured } from "@/lib/mercadopago/config"
import {
  cancelPreapproval,
  getPreapproval,
  parseFitproExternalReference,
  type MpPreapprovalStatus,
} from "@/lib/mercadopago/preapproval"
import { ensurePremiumSchema } from "@/lib/premium/schema"
import {
  activatePremiumFromPayment,
  expireUserSubscription,
  setUserPaymentPending,
  setUserSubscriptionCancelled,
} from "@/lib/premium/subscription-store"
import type { PaymentStatus } from "@/lib/premium/types"

function mapMpPaymentStatus(status: MpPreapprovalStatus): PaymentStatus {
  if (status === "authorized") return "authorized"
  if (status === "pending") return "pending"
  if (status === "paused") return "paused"
  if (status === "cancelled") return "cancelled"
  return "none"
}

export async function syncMercadoPagoPreapproval(preapprovalId: string): Promise<void> {
  if (!isMercadoPagoConfigured()) return

  const mp = await getPreapproval(preapprovalId)
  const ref = parseFitproExternalReference(mp.external_reference)
  if (!ref) {
    console.warn("syncMercadoPagoPreapproval: external_reference inválido", mp.external_reference)
    return
  }

  const paymentStatus = mapMpPaymentStatus(mp.status)
  const nextBilling = mp.next_payment_date ? new Date(mp.next_payment_date) : null

  await ensurePremiumSchema()

  if (mp.status === "authorized") {
    await activatePremiumFromPayment({
      userId: ref.userId,
      academiaId: ref.academiaId,
      provider: "mercadopago",
      subscriptionId: preapprovalId,
      paymentStatus: "authorized",
      nextBillingAt: nextBilling,
      extendFromNow: true,
    })
    console.info("[mp:sync] premium ativado", {
      preapprovalId,
      userId: ref.userId,
      academiaId: ref.academiaId,
      nextBilling: mp.next_payment_date ?? null,
    })
    return
  }

  if (mp.status === "pending") {
    await setUserPaymentPending({
      userId: ref.userId,
      subscriptionId: preapprovalId,
      paymentStatus: "pending",
    })
    return
  }

  if (mp.status === "cancelled" || mp.status === "paused") {
    await setUserSubscriptionCancelled({
      userId: ref.userId,
      paymentStatus: mp.status === "cancelled" ? "cancelled" : "paused",
    })
  }
}

/** Renovação mensal confirmada (webhook subscription_authorized_payment). */
export async function syncMercadoPagoAuthorizedPayment(paymentId: string): Promise<void> {
  if (!isMercadoPagoConfigured()) return

  const { mercadoPagoFetch } = await import("@/lib/mercadopago/client")
  type MpPayment = {
    status?: string
    preapproval_id?: string
    external_reference?: string
  }

  const payment = await mercadoPagoFetch<MpPayment>(`/v1/payments/${paymentId}`)
  const preapprovalId = payment.preapproval_id
  if (!preapprovalId) return

  const mp = await getPreapproval(preapprovalId)
  const ref = parseFitproExternalReference(mp.external_reference ?? payment.external_reference)
  if (!ref) return

  if (payment.status === "approved") {
    const nextBilling = mp.next_payment_date ? new Date(mp.next_payment_date) : null
    await activatePremiumFromPayment({
      userId: ref.userId,
      academiaId: ref.academiaId,
      provider: "mercadopago",
      subscriptionId: preapprovalId,
      paymentStatus: "authorized",
      nextBillingAt: nextBilling,
      extendFromNow: false,
    })
  }
}

export async function cancelMercadoPagoSubscriptionForUser(userId: number): Promise<void> {
  const rows = await query<{ subscription_id: string | null }>(
    `SELECT subscription_id FROM usuarios WHERE id = ? LIMIT 1`,
    [userId],
  )
  const subId = rows[0]?.subscription_id
  if (!subId) {
    await setUserSubscriptionCancelled({ userId, paymentStatus: "cancelled" })
    return
  }

  if (isMercadoPagoConfigured()) {
    try {
      await cancelPreapproval(subId)
    } catch (e) {
      console.error("cancelPreapproval", e)
    }
  }

  await setUserSubscriptionCancelled({ userId, paymentStatus: "cancelled" })
}

/** Marca usuários premium expirados como expired (cron implícito no load). */
export async function expireStalePremiumUsers(userId: number): Promise<void> {
  const rows = await query<{
    subscription_status: string | null
    premium_expires_at: Date | string | null
  }>(
    `SELECT subscription_status, premium_expires_at FROM usuarios WHERE id = ? LIMIT 1`,
    [userId],
  )
  const row = rows[0]
  if (!row) return
  const activeStatuses = ["premium", "cancelled"]
  if (!activeStatuses.includes(row.subscription_status ?? "")) return

  const expires = row.premium_expires_at
    ? new Date(String(row.premium_expires_at))
    : null
  if (expires && expires.getTime() <= Date.now()) {
    await expireUserSubscription(userId)
  }
}
