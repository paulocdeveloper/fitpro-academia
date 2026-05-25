import { NextResponse } from "next/server"
import type { JwtPayloadUser } from "@/lib/auth/jwt"
import { isFitnessRole, isStaffRole } from "@/lib/auth/roles"
import { getSessionFromRequest } from "@/lib/auth/session"

export type AuthSuccess = { ok: true; session: JwtPayloadUser }
export type AuthFailure = { ok: false; response: NextResponse }
export type AuthResult = AuthSuccess | AuthFailure

/** Exige JWT válido (cookie `fitpro_token` ou header `Authorization: Bearer ...`). */
export async function requireAuth(req: Request): Promise<AuthResult> {
  const session = await getSessionFromRequest(req)
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Não autenticado." }, { status: 401 }),
    }
  }
  return { ok: true, session }
}

/** Exige login e perfil admin ou personal (gestão da academia). */
export async function requireStaff(req: Request): Promise<AuthResult> {
  const auth = await requireAuth(req)
  if (!auth.ok) return auth
  if (!isStaffRole(auth.session.role)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Acesso negado." }, { status: 403 }),
    }
  }
  return auth
}

/** Exige login e perfil aluno ou usuario (área fitness). */
export async function requireFitness(req: Request): Promise<AuthResult> {
  const auth = await requireAuth(req)
  if (!auth.ok) return auth
  if (!isFitnessRole(auth.session.role)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Acesso negado." }, { status: 403 }),
    }
  }
  return auth
}
