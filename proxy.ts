import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { verifyAccessToken } from "@/lib/auth/jwt"
import { AUTH_COOKIE } from "@/lib/auth/session"

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/alunos",
  "/treinos",
  "/financeiro",
  "/planos",
  "/agenda",
  "/dietas",
  "/exercicios",
  "/estoque",
  "/configuracoes",
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

  if (pathname.startsWith("/login") || pathname.startsWith("/cadastro")) {
    return NextResponse.next()
  }

  if (pathname.startsWith("/api/auth/login") || pathname.startsWith("/api/auth/logout")) {
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
    await verifyAccessToken(token)
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
