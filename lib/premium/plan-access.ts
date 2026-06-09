import type { UserRole } from "@/lib/auth/roles"
import { isStaffRole, isUsuarioRole } from "@/lib/auth/roles"
import type { PlanType } from "@/lib/premium/types"

/** Slug do plano somente nutrição (lido de `plan_type` existente — sem alterar schema). */
export const NUTRICAO_PLAN_SLUG = "nutricao" as const

export const NUTRICAO_PLAN_NAME = "NUTRIÇÃO"

export const WORKOUT_BLOCKED_MESSAGE =
  "Seu plano atual inclui apenas Nutrição. Faça upgrade para desbloquear Treinos e Exercícios."

export const WORKOUT_BLOCKED_PATH = "/upgrade-treinos"

/** Rotas de treino bloqueadas no plano NUTRIÇÃO. */
export const WORKOUT_BLOCKED_PREFIXES = [
  "/treino-inteligente",
  "/treinos",
  "/exercicios",
  "/coach-ia",
  "/evolucao",
] as const

/** Rotas permitidas no plano NUTRIÇÃO. */
export const NUTRICAO_ONLY_ALLOWED_PREFIXES = [
  "/dietas",
  "/nutricao",
  "/perfil",
  "/premium",
  "/minha-assinatura",
  WORKOUT_BLOCKED_PATH,
] as const

export function normalizePlanTypeSlug(raw: string | null | undefined): PlanType {
  const v = (raw ?? "free").toLowerCase()
  if (v === NUTRICAO_PLAN_SLUG || v === "nutrition_only") return NUTRICAO_PLAN_SLUG
  if (v === "premium_nutrition") return "premium_nutrition"
  return "free"
}

export function isNutricaoOnlyPlan(planType: string | null | undefined): boolean {
  return normalizePlanTypeSlug(planType) === NUTRICAO_PLAN_SLUG
}

export function isCoachIaPath(pathname: string): boolean {
  return pathname === "/coach-ia" || pathname.startsWith("/coach-ia/")
}

export function isWorkoutPath(pathname: string): boolean {
  return WORKOUT_BLOCKED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  )
}

export function hasNutritionAccess(
  role: UserRole,
  planType: string | null | undefined,
  isPremium = false,
): boolean {
  if (!isUsuarioRole(role)) return true
  return isPremium || isNutricaoOnlyPlan(planType)
}

export function hasWorkoutAccess(
  role: UserRole,
  planType: string | null | undefined,
): boolean {
  if (!isUsuarioRole(role)) return true
  return !isNutricaoOnlyPlan(planType)
}

export function defaultHomeForUsuario(planType: string | null | undefined): string {
  return isNutricaoOnlyPlan(planType) ? "/dietas" : "/treino-inteligente"
}
