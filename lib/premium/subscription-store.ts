import { query } from "@/lib/db"
import { ensurePremiumSchema } from "@/lib/premium/schema"
import { PREMIUM_PLAN, type PaymentProvider, type PaymentStatus } from "@/lib/premium/types"

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d
}

export async function activatePremiumFromPayment(input: {
  userId: number
  academiaId: number
  provider: PaymentProvider
  subscriptionId: string
  paymentStatus: PaymentStatus
  nextBillingAt: Date | null
  /** true = primeira ativação; false = renovação (estende a partir do fim atual). */
  extendFromNow: boolean
}): Promise<void> {
  await ensurePremiumSchema()

  const rows = await query<{ premium_expires_at: Date | string | null }>(
    `SELECT premium_expires_at FROM usuarios WHERE id = ? LIMIT 1`,
    [input.userId],
  )
  const current = rows[0]?.premium_expires_at
    ? new Date(String(rows[0].premium_expires_at))
    : null

  let expiresAt: Date
  if (input.extendFromNow) {
    expiresAt = addMonths(new Date(), 1)
  } else {
    const base =
      current && current.getTime() > Date.now() ? current : new Date()
    expiresAt = addMonths(base, 1)
  }

  const nextBilling =
    input.nextBillingAt && input.nextBillingAt.getTime() > Date.now()
      ? input.nextBillingAt
      : expiresAt

  await query(
    `UPDATE usuarios SET
      subscription_status = 'premium',
      plan_type = ?,
      premium_expires_at = ?,
      payment_provider = ?,
      subscription_id = ?,
      payment_status = ?,
      next_billing_at = ?,
      updated_at = now()
     WHERE id = ?`,
    [
      PREMIUM_PLAN.slug,
      expiresAt.toISOString(),
      input.provider,
      input.subscriptionId,
      input.paymentStatus,
      nextBilling.toISOString(),
      input.userId,
    ],
  )

  await insertSubscriptionRecord(
    input.userId,
    input.academiaId,
    input.provider ?? "mercadopago",
    input.subscriptionId,
    expiresAt,
    input.paymentStatus,
  )
}

export async function setUserPaymentPending(input: {
  userId: number
  subscriptionId: string
  paymentStatus: PaymentStatus
}): Promise<void> {
  await ensurePremiumSchema()
  await query(
    `UPDATE usuarios SET
      subscription_status = 'free',
      plan_type = 'free',
      payment_provider = 'mercadopago',
      subscription_id = ?,
      payment_status = ?,
      updated_at = now()
     WHERE id = ?`,
    [input.subscriptionId, input.paymentStatus, input.userId],
  )
}

export async function setUserSubscriptionCancelled(input: {
  userId: number
  paymentStatus: PaymentStatus
}): Promise<void> {
  await ensurePremiumSchema()
  await query(
    `UPDATE usuarios SET
      subscription_status = 'cancelled',
      payment_status = ?,
      next_billing_at = NULL,
      updated_at = now()
     WHERE id = ?`,
    [input.paymentStatus, input.userId],
  )
}

export async function expireUserSubscription(userId: number): Promise<void> {
  await ensurePremiumSchema()
  await query(
    `UPDATE usuarios SET
      subscription_status = 'expired',
      plan_type = 'free',
      payment_status = 'none',
      next_billing_at = NULL,
      updated_at = now()
     WHERE id = ?`,
    [userId],
  )
}

async function insertSubscriptionRecord(
  userId: number,
  academiaId: number,
  provider: string,
  externalId: string,
  expiresAt: Date,
  paymentStatus: string,
) {
  try {
    await query(
      `INSERT INTO subscriptions
        (user_id, academia_id, plan_type, status, payment_status, amount_cents, currency, provider, external_id, started_at, expires_at)
       VALUES (?, ?, ?, 'active', ?, ?, 'BRL', ?, ?, now(), ?)`,
      [
        userId,
        academiaId,
        PREMIUM_PLAN.slug,
        paymentStatus,
        PREMIUM_PLAN.priceCents,
        provider,
        externalId,
        expiresAt.toISOString(),
      ],
    )
  } catch {
    /* tabela opcional */
  }
}
