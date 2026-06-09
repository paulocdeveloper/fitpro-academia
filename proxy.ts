import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { verifyAccessToken } from "@/lib/auth/jwt"
import { isMasterEmail } from "@/lib/auth/master"
import { isFitnessRole } from "@/lib/auth/roles"
import {
  defaultHomeForRole,
  redirectForForbiddenPath,
} from "@/lib/auth/route-access"
import { AUTH_COOKIE } from "@/lib/auth/session"
import { requiresNutritionAccess } from "@/lib/premium/paths"
import { PREMIUM_UPSELL_PATH } from "@/lib/auth/route-access"
import {
  hasNutritionAccess,
  isCoachIaPath,
  isNutricaoOnlyPlan,
  isWorkoutPath,
  WORKOUT_BLOCKED_PATH,
} from "@/lib/premium/plan-access"
import { isUsuarioRole } from "@/lib/auth/roles"

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/alunos",
  "/treinos",
  "/treino-inteligente",
  "/financeiro",
  "/planos",
  "/agenda",
  "/dietas",
  "/nutricao",
  "/exercicios",
  "/estoque",
  "/configuracoes",
  "/evolucao",
  "/perfil",
  "/premium",
  "/minha-assinatura",
  "/upgrade-treinos",
  "/master",
]

function needsPageAuth(pathname: string) {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

function withNoIndex(response: NextResponse) {
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive")
  return response
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/cadastro") ||
    pathname.startsWith("/cadastro-fitness")
  ) {
    return NextResponse.next()
  }

  if (
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/api/auth/logout") ||
    pathname.startsWith("/api/auth/register-fitness") ||
    pathname.startsWith("/api/auth/forgot-password")
  ) {
    return NextResponse.next()
  }

  if (pathname.startsWith("/api/")) {
    return withNoIndex(NextResponse.next())
  }

  if (!needsPageAuth(pathname)) {
    return NextResponse.next()
  }

  const token = request.cookies.get(AUTH_COOKIE)?.value
  if (!token) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("next", pathname)
    return withNoIndex(NextResponse.redirect(url))
  }

  try {
    const session = await verifyAccessToken(token)
    const isPremium = session.isPremium === true
    const planType = session.planType ?? "free"

    if (pathname === "/dashboard" && isFitnessRole(session.role)) {
      const url = request.nextUrl.clone()
      url.pathname = defaultHomeForRole(session.role, planType)
      return withNoIndex(NextResponse.redirect(url))
    }

    if (
      isUsuarioRole(session.role) &&
      isNutricaoOnlyPlan(planType) &&
      isWorkoutPath(pathname) &&
      pathname !== WORKOUT_BLOCKED_PATH
    ) {
      const url = request.nextUrl.clone()
      url.pathname = WORKOUT_BLOCKED_PATH
      return withNoIndex(NextResponse.redirect(url))
    }

    const needsNutritionUpsell =
      requiresNutritionAccess(pathname, session.role, planType, isPremium) ||
      (isUsuarioRole(session.role) &&
        isCoachIaPath(pathname) &&
        !hasNutritionAccess(session.role, planType, isPremium))

    if (needsNutritionUpsell) {
      const url = request.nextUrl.clone()
      url.pathname = PREMIUM_UPSELL_PATH
      return withNoIndex(NextResponse.redirect(url))
    }

    const forbidden = redirectForForbiddenPath(pathname, session.role, isPremium, planType)
    if (forbidden) {
      const url = request.nextUrl.clone()
      url.pathname = forbidden
      return withNoIndex(NextResponse.redirect(url))
    }

    if (
      (pathname === "/master" || pathname.startsWith("/master/")) &&
      !isMasterEmail(session.email)
    ) {
      const url = request.nextUrl.clone()
      url.pathname = defaultHomeForRole(session.role)
      return withNoIndex(NextResponse.redirect(url))
    }

    return withNoIndex(NextResponse.next())
  } catch {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("next", pathname)
    const res = withNoIndex(NextResponse.redirect(url))
    res.cookies.set(AUTH_COOKIE, "", { path: "/", maxAge: 0 })
    return res
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
