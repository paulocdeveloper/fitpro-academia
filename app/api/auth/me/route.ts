import { NextResponse } from "next/server"
import { getSessionFromRequest } from "@/lib/auth/session"

export async function GET(req: Request) {
  const session = await getSessionFromRequest(req)
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 })
  }
  return NextResponse.json({
    user: {
      id: session.userId,
      email: session.email,
      role: session.role,
      academiaId: session.academiaId,
    },
  })
}
