export type SubscriptionStatus = "free" | "premium" | "expired" | "cancelled"

export type PlanType = "free" | "premium_nutrition" | "nutricao"

export type PaymentProvider = "mock" | "stripe" | "mercadopago" | null

/** Status do pagamento no gateway (Mercado Pago preapproval). */
export type PaymentStatus =
  | "none"
  | "pending"
  | "authorized"
  | "paused"
  | "cancelled"
  | "rejected"

export type UserSubscription = {
  subscriptionStatus: SubscriptionStatus
  planType: PlanType
  premiumExpiresAt: string | null
  isPremium: boolean
  paymentProvider: PaymentProvider
  subscriptionId: string | null
  paymentStatus: PaymentStatus
  nextBillingAt: string | null
  canCancel: boolean
}

export const PREMIUM_PLAN = {
  slug: "premium_nutrition" as const,
  name: "FitPro Premium Nutrição",
  priceBrl: 10.9,
  priceCents: 1090,
  interval: "month" as const,
}

/** Plano somente nutrição — acesso via `plan_type = 'nutricao'` (camada de aplicação). */
export const NUTRICAO_PLAN = {
  slug: "nutricao" as const,
  name: "NUTRIÇÃO",
  features: {
    nutrition: true,
    scanner: true,
    history: true,
    workouts: false,
    exercises: false,
    trainingSheet: false,
    workoutPremium: false,
  },
} as const
