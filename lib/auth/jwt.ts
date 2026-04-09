import { SignJWT, jwtVerify } from "jose"
import type { UserRole } from "./roles"
import { getJwtSecretBytes } from "./secret"

export type JwtPayloadUser = {
  userId: number
  role: UserRole
  email: string
  /** Tenant SaaS: todas as queries de dados devem filtrar por esta academia. */
  academiaId: number
}

export async function signAccessToken(payload: JwtPayloadUser): Promise<string> {
  const key = getJwtSecretBytes()
  return new SignJWT({
    role: payload.role,
    email: payload.email,
    academiaId: payload.academiaId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(payload.userId))
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(key)
}

export async function verifyAccessToken(token: string): Promise<JwtPayloadUser> {
  const key = getJwtSecretBytes()
  const { payload } = await jwtVerify(token, key)
  const sub = payload.sub
  if (!sub || payload.role == null) {
    throw new Error("Token inválido")
  }
  const rawAcad = payload.academiaId
  const academiaId =
    typeof rawAcad === "number"
      ? rawAcad
      : typeof rawAcad === "string"
        ? Number(rawAcad)
        : NaN
  if (!Number.isFinite(academiaId) || academiaId < 1) {
    throw new Error("Token sem academia")
  }
  return {
    userId: Number(sub),
    role: payload.role as UserRole,
    email: typeof payload.email === "string" ? payload.email : "",
    academiaId,
  }
}
