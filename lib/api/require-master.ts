import { NextResponse } from "next/server"
import { isMasterEmail } from "@/lib/auth/master"
import { requireAuth, type AuthResult } from "@/lib/api/require-auth"

/** Exige login e e-mail master@academia.com. */
export async function requireMaster(req: Request): Promise<AuthResult> {
  const auth = await requireAuth(req)
  if (!auth.ok) return auth
  if (!isMasterEmail(auth.session.email)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Acesso negado." }, { status: 403 }),
    }
  }
  return auth
}
