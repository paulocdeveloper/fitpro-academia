import { verifyAccessToken } from "./jwt"

export const AUTH_COOKIE = "fitpro_token"

export function getBearerToken(req: Request): string | null {
  const h = req.headers.get("authorization")
  if (!h?.startsWith("Bearer ")) return null
  return h.slice(7).trim() || null
}

export function getCookieToken(req: Request): string | null {
  const raw = req.headers.get("cookie")
  if (!raw) return null
  const parts = raw.split(";").map((p) => p.trim())
  const prefix = `${AUTH_COOKIE}=`
  for (const p of parts) {
    if (p.startsWith(prefix)) {
      return decodeURIComponent(p.slice(prefix.length))
    }
  }
  return null
}

export async function getSessionFromRequest(req: Request) {
  const token = getBearerToken(req) ?? getCookieToken(req)
  if (!token) return null
  try {
    return await verifyAccessToken(token)
  } catch {
    return null
  }
}
