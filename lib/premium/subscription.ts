import { query } from "@/lib/db"
import type { UserRole } from "@/lib/auth/roles"
import { isStaffRole, isUsuarioRole } from "@/lib/auth/roles"
import { ensurePremiumSchema } from "@/lib/premium/schema"
import { PREMIUM_PLAN, type PlanType, type SubscriptionStatus, type UserSubscription } from "@/lib/premium/types"

type SubscriptionRow = {
  subscription_status: string | null
  premium_expires_at: Date | string | null
  plan_type: string | null
}

function normalizeStatus(raw: string | null, expiresAt: Date | null): SubscriptionStatus {
  const s = (raw ?? "free").toLowerCase()
  if (s === "premium" && expiresAt && expiresAt.getTime() <= Date.now()) {
    return "expired"
  }
  if (s === "premium") return "premium"
  if (s === "expired" || s === "cancelled") return s
  return "free"
}

function parseExpires(v: Date | string | null): Date | null {
  if (v == null) return null
  if (v instanceof Date) return v
  const d = new Date(String(v))
  return Number.isNaN(d.getTime()) ? null : d
}

export function computeIsPremium(
  status: SubscriptionStatus,
  expiresAt: Date | null,
  role: UserRole,
): boolean {
  if (isStaffRole(role)) return true
  if (!isUsuarioRole(role)) return true
  if (status !== "premium") return false
  if (!expiresAt) return true
  return expiresAt.getTime() > Date.now()
}

export async function loadUserSubscription(
  userId: number,
  role: UserRole,
): Promise<UserSubscription> {
  await ensurePremiumSchema()

  const rows = await query<SubscriptionRow>(
    `SELECT subscription_status, premium_expires_at, plan_type
     FROM usuarios WHERE id = ? LIMIT 1`,
    [userId],
  )
  const row = rows[0]
  const expiresAt = parseExpires(row?.premium_expires_at ?? null)
  const subscriptionStatus = normalizeStatus(row?.subscription_status ?? null, expiresAt)
  const planType = (row?.plan_type ?? "free") as PlanType
  const isPremium = computeIsPremium(subscriptionStatus, expiresAt, role)

  return {
    subscriptionStatus: isPremium ? "premium" : subscriptionStatus,
    planType: isPremium ? "premium_nutrition" : planType,
    premiumExpiresAt: expiresAt?.toISOString() ?? null,
    isPremium,
  }
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d
}

export async function activatePremiumSubscription(
  userId: number,
  academiaId: number,
  provider: "mock" | "stripe" | "mercadopago" = "mock",
  externalId?: string | null,
): Promise<UserSubscription> {
  await ensurePremiumSchema()

  const expiresAt = addMonths(new Date(), 1)
  const expiresIso = expiresAt.toISOString()

  await query(
    `UPDATE usuarios SET
      subscription_status = 'premium',
      plan_type = ?,
      premium_expires_at = ?,
      updated_at = now()
     WHERE id = ?`,
    [PREMIUM_PLAN.slug, expiresIso, userId],
  )

  await insertSubscriptionRecord(userId, academiaId, provider, externalId, expiresAt)

  return {
    subscriptionStatus: "premium",
    planType: "premium_nutrition",
    premiumExpiresAt: expiresIso,
    isPremium: true,
  }
}

async function insertSubscriptionRecord(
  userId: number,
  academiaId: number,
  provider: string,
  externalId: string | null | undefined,
  expiresAt: Date,
) {
  try {
    await query(
      `INSERT INTO subscriptions
        (user_id, academia_id, plan_type, status, amount_cents, currency, provider, external_id, started_at, expires_at)
       VALUES (?, ?, ?, 'active', ?, 'BRL', ?, ?, now(), ?)`,
      [
        userId,
        academiaId,
        PREMIUM_PLAN.slug,
        PREMIUM_PLAN.priceCents,
        provider,
        externalId ?? null,
        expiresAt.toISOString(),
      ],
    )
  } catch {
    /* tabela opcional */
  }
}

export {
  PREMIUM_NUTRITION_PREFIXES,
  isPremiumNutritionPath,
  requiresPremiumForPath,
} from "@/lib/premium/paths"
