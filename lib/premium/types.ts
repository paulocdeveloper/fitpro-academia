export type SubscriptionStatus = "free" | "premium" | "expired" | "cancelled"

export type PlanType = "free" | "premium_nutrition"

export type PaymentProvider = "mock" | "stripe" | "mercadopago"

export type UserSubscription = {
  subscriptionStatus: SubscriptionStatus
  planType: PlanType
  premiumExpiresAt: string | null
  isPremium: boolean
}

export const PREMIUM_PLAN = {
  slug: "premium_nutrition" as const,
  name: "FitPro Premium Nutrição",
  priceBrl: 10.9,
  priceCents: 1090,
  interval: "month" as const,
}
