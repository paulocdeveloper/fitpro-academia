export type BillingPlanSlug = "mensal" | "semestral" | "anual"

export type BillingPlanBadge = "popular" | "best"

export type BillingPlan = {
  slug: BillingPlanSlug
  name: string
  priceBrl: number
  priceCents: number
  description: string
  badge?: BillingPlanBadge
  billingLabel: string
  recurringLabel: string
  monthsEquivalent: number
  recurring: {
    frequency: number
    frequencyType: "months"
  }
}

const MENSAL_PRICE = 10.9

export const BILLING_PLANS: BillingPlan[] = [
  {
    slug: "mensal",
    name: "Mensal",
    priceBrl: MENSAL_PRICE,
    priceCents: 1090,
    description: "Acesso completo à Nutrição IA, Scanner Alimentar e IA Vision.",
    billingLabel: "R$ 10,90",
    recurringLabel: "por mês",
    monthsEquivalent: 1,
    recurring: { frequency: 1, frequencyType: "months" },
  },
  {
    slug: "semestral",
    name: "Semestral",
    priceBrl: 49.9,
    priceCents: 4990,
    description: "Mesmo acesso do plano mensal com desconto especial.",
    badge: "popular",
    billingLabel: "R$ 49,90",
    recurringLabel: "a cada 6 meses",
    monthsEquivalent: 6,
    recurring: { frequency: 6, frequencyType: "months" },
  },
  {
    slug: "anual",
    name: "Anual",
    priceBrl: 97,
    priceCents: 9700,
    description: "Melhor custo-benefício.",
    badge: "best",
    billingLabel: "R$ 97,00",
    recurringLabel: "por ano",
    monthsEquivalent: 12,
    recurring: { frequency: 12, frequencyType: "months" },
  },
]

export function getBillingPlan(slug: string | undefined): BillingPlan | null {
  if (!slug) return BILLING_PLANS[0] ?? null
  return BILLING_PLANS.find((p) => p.slug === slug) ?? null
}

export function formatPriceBrl(value: number): string {
  return value.toFixed(2).replace(".", ",")
}

export function computeSavingsPercent(plan: BillingPlan): number | null {
  if (plan.slug === "mensal") return null
  const monthlyEquivalent = MENSAL_PRICE * plan.monthsEquivalent
  if (monthlyEquivalent <= plan.priceBrl) return null
  return Math.round((1 - plan.priceBrl / monthlyEquivalent) * 100)
}

export function getBillingPlanBadgeLabel(badge: BillingPlanBadge): string {
  return badge === "popular" ? "Mais Popular" : "Melhor Oferta"
}
