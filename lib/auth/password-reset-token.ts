import { SignJWT, jwtVerify } from "jose"
import bcrypt from "bcryptjs"
import { getJwtSecretBytes } from "@/lib/auth/secret"

const RESET_TYP = "pwd_reset"
const RESET_TTL = "15m"

export type ResetChannel = "email" | "sms"

export type PasswordResetVerifyResult =
  | { valid: true; userId: number; channel: ResetChannel }
  | { valid: false; reason: "invalid" | "expired" | "malformed" }

export async function signPasswordResetToken(
  userId: number,
  code: string,
  channel: ResetChannel,
): Promise<string> {
  const codeHash = await bcrypt.hash(code, 10)
  return new SignJWT({ typ: RESET_TYP, codeHash, channel })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime(RESET_TTL)
    .sign(getJwtSecretBytes())
}

export async function verifyPasswordResetCode(
  token: string,
  code: string,
): Promise<PasswordResetVerifyResult> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretBytes())
    if (payload.typ !== RESET_TYP || !payload.sub) {
      return { valid: false, reason: "malformed" }
    }
    const codeHash = payload.codeHash
    if (typeof codeHash !== "string") {
      return { valid: false, reason: "malformed" }
    }
    const channel = payload.channel === "sms" ? "sms" : "email"
    const ok = await bcrypt.compare(code.replace(/\D/g, ""), codeHash)
    if (!ok) return { valid: false, reason: "invalid" }
    const userId = Number(payload.sub)
    if (!Number.isFinite(userId) || userId < 1) {
      return { valid: false, reason: "malformed" }
    }
    return { valid: true, userId, channel }
  } catch (e) {
    const name = (e as { code?: string })?.code
    if (name === "ERR_JWT_EXPIRED") return { valid: false, reason: "expired" }
    return { valid: false, reason: "malformed" }
  }
}
