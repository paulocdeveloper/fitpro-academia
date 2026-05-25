import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { verifyAccessToken } from "@/lib/auth/jwt"
import { isFitnessRole } from "@/lib/auth/roles"
import {
  defaultHomeForRole,
  redirectForForbiddenPath,
} from "@/lib/auth/route-access"
import { AUTH_COOKIE } from "@/lib/auth/session"
import { requiresPremiumForPath } from "@/lib/premium/paths"
import { PREMIUM_UPSELL_PATH } from "@/lib/auth/route-access"

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
    pathname.startsWith("/api/auth/register-fitness")
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

    if (pathname === "/dashboard" && isFitnessRole(session.role)) {
      const url = request.nextUrl.clone()
      url.pathname = defaultHomeForRole(session.role)
      return withNoIndex(NextResponse.redirect(url))
    }

    if (requiresPremiumForPath(pathname, session.role) && !isPremium) {
      const url = request.nextUrl.clone()
      url.pathname = PREMIUM_UPSELL_PATH
      return withNoIndex(NextResponse.redirect(url))
    }

    const forbidden = redirectForForbiddenPath(pathname, session.role, isPremium)
    if (forbidden) {
      const url = request.nextUrl.clone()
      url.pathname = forbidden
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
