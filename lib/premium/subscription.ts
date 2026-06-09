import { query } from "@/lib/db"
import type { UserRole } from "@/lib/auth/roles"
import { isStaffRole, isUsuarioRole } from "@/lib/auth/roles"
import { isMercadoPagoConfigured } from "@/lib/mercadopago/config"
import { getPreapproval } from "@/lib/mercadopago/preapproval"
import { expireStalePremiumUsers } from "@/lib/premium/mercadopago-sync"
import { ensurePremiumSchema } from "@/lib/premium/schema"
import {
  activatePremiumFromPayment,
  addMonths,
} from "@/lib/premium/subscription-store"
import { normalizePlanTypeSlug } from "@/lib/premium/plan-access"
import {
  type PaymentProvider,
  type PaymentStatus,
  type PlanType,
  type SubscriptionStatus,
  type UserSubscription,
} from "@/lib/premium/types"

type SubscriptionRow = {
  subscription_status: string | null
  premium_expires_at: Date | string | null
  plan_type: string | null
  payment_provider: string | null
  subscription_id: string | null
  payment_status: string | null
  next_billing_at: Date | string | null
}

function parseExpires(v: Date | string | null): Date | null {
  if (v == null) return null
  if (v instanceof Date) return v
  const d = new Date(String(v))
  return Number.isNaN(d.getTime()) ? null : d
}

function normalizeStatus(
  raw: string | null,
  expiresAt: Date | null,
  paymentStatus: PaymentStatus,
): SubscriptionStatus {
  const s = (raw ?? "free").toLowerCase() as SubscriptionStatus
  if (s === "premium" && expiresAt && expiresAt.getTime() <= Date.now()) {
    return "expired"
  }
  if (s === "premium") return "premium"
  if (s === "cancelled" && expiresAt && expiresAt.getTime() > Date.now()) {
    return "cancelled"
  }
  if (s === "cancelled" && expiresAt && expiresAt.getTime() <= Date.now()) {
    return "expired"
  }
  if (s === "expired") return "expired"
  if (paymentStatus === "pending") return "free"
  return "free"
}

function mapPaymentStatus(raw: string | null): PaymentStatus {
  const v = (raw ?? "none").toLowerCase()
  if (
    v === "pending" ||
    v === "authorized" ||
    v === "paused" ||
    v === "cancelled" ||
    v === "rejected"
  ) {
    return v
  }
  return "none"
}

export function computeIsPremium(
  status: SubscriptionStatus,
  expiresAt: Date | null,
  role: UserRole,
): boolean {
  if (isStaffRole(role)) return true
  if (!isUsuarioRole(role)) return true
  const activeUntilPeriodEnd =
    (status === "premium" || status === "cancelled") &&
    expiresAt &&
    expiresAt.getTime() > Date.now()
  if (activeUntilPeriodEnd) return true
  if (status !== "premium") return false
  if (!expiresAt) return true
  return expiresAt.getTime() > Date.now()
}

async function maybeSyncMercadoPago(row: SubscriptionRow, userId: number): Promise<void> {
  if (
    !isMercadoPagoConfigured() ||
    row.payment_provider !== "mercadopago" ||
    !row.subscription_id
  ) {
    return
  }
  try {
    const mp = await getPreapproval(row.subscription_id)
    if (mp.status === "authorized") {
      const nextBilling = mp.next_payment_date ? new Date(mp.next_payment_date) : null
      const rows = await query<{ academia_id: number }>(
        `SELECT academia_id FROM usuarios WHERE id = ? LIMIT 1`,
        [userId],
      )
      const academiaId = rows[0]?.academia_id ?? 0
      if (academiaId > 0) {
        await activatePremiumFromPayment({
          userId,
          academiaId,
          provider: "mercadopago",
          subscriptionId: row.subscription_id,
          paymentStatus: "authorized",
          nextBillingAt: nextBilling,
          extendFromNow: row.subscription_status !== "premium",
        })
      }
    }
  } catch {
    /* sync opcional no status */
  }
}

export async function loadUserSubscription(
  userId: number,
  role: UserRole,
  options?: { syncMp?: boolean },
): Promise<UserSubscription> {
  await ensurePremiumSchema()
  await expireStalePremiumUsers(userId)

  const rows = await query<SubscriptionRow>(
    `SELECT subscription_status, premium_expires_at, plan_type,
            payment_provider, subscription_id, payment_status, next_billing_at
     FROM usuarios WHERE id = ? LIMIT 1`,
    [userId],
  )
  const row = rows[0]

  if (options?.syncMp && row) {
    await maybeSyncMercadoPago(row, userId)
    return loadUserSubscription(userId, role, { syncMp: false })
  }

  const expiresAt = parseExpires(row?.premium_expires_at ?? null)
  const paymentStatus = mapPaymentStatus(row?.payment_status ?? null)
  const subscriptionStatus = normalizeStatus(
    row?.subscription_status ?? null,
    expiresAt,
    paymentStatus,
  )
  const rawPlanType = row?.plan_type ?? "free"
  const normalizedPlan = normalizePlanTypeSlug(rawPlanType)
  const isNutricaoOnly = normalizedPlan === "nutricao"
  const isPremiumPaid = computeIsPremium(subscriptionStatus, expiresAt, role)
  const isPremium = isPremiumPaid || isNutricaoOnly
  const planType: PlanType = isNutricaoOnly
    ? "nutricao"
    : isPremiumPaid
      ? "premium_nutrition"
      : "free"
  const provider = (row?.payment_provider ?? null) as PaymentProvider
  const nextBillingAt = parseExpires(row?.next_billing_at ?? null)

  const displayStatus: SubscriptionStatus = isPremium
    ? subscriptionStatus === "cancelled"
      ? "cancelled"
      : "premium"
    : subscriptionStatus

  return {
    subscriptionStatus: displayStatus,
    planType,
    premiumExpiresAt: expiresAt?.toISOString() ?? null,
    isPremium,
    paymentProvider: provider,
    subscriptionId: row?.subscription_id ?? null,
    paymentStatus,
    nextBillingAt: nextBillingAt?.toISOString() ?? null,
    canCancel: Boolean(
      isPremium &&
        provider === "mercadopago" &&
        row?.subscription_id &&
        paymentStatus === "authorized" &&
        subscriptionStatus !== "cancelled",
    ),
  }
}

/** Mock apenas se explicitamente habilitado (dev). */
export async function activatePremiumSubscriptionMock(
  userId: number,
  academiaId: number,
): Promise<UserSubscription> {
  const expiresAt = addMonths(new Date(), 1)
  await activatePremiumFromPayment({
    userId,
    academiaId,
    provider: "mock",
    subscriptionId: `mock_${Date.now()}`,
    paymentStatus: "authorized",
    nextBillingAt: expiresAt,
    extendFromNow: true,
  })
  return loadUserSubscription(userId, "usuario")
}

export {
  PREMIUM_NUTRITION_PREFIXES,
  isPremiumNutritionPath,
  requiresPremiumForPath,
  requiresNutritionAccess,
} from "@/lib/premium/paths"
