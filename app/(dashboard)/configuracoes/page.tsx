import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { verifyAccessToken } from "@/lib/auth/jwt"
import { AUTH_COOKIE } from "@/lib/auth/session"
import { ConfiguracoesClient } from "./configuracoes-client"

export default async function ConfiguracoesPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get(AUTH_COOKIE)?.value
  if (!token) {
    redirect("/login?next=/configuracoes")
  }

  let session
  try {
    session = await verifyAccessToken(token)
  } catch {
    redirect("/login?next=/configuracoes")
  }

  return (
    <ConfiguracoesClient
      initialUser={{
        id: session.userId,
        email: session.email,
        role: session.role,
        academiaId: session.academiaId,
      }}
    />
  )
}
