/** Segredo HS256 — use JWT_SECRET com pelo menos 32 caracteres em produção. */

export function getJwtSecretBytes(): Uint8Array {
  const raw = process.env.JWT_SECRET?.trim()
  if (raw && raw.length >= 32) {
    return new TextEncoder().encode(raw)
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET é obrigatório em produção (mínimo 32 caracteres).")
  }
  const fallback = "fitpro-dev-insecure-change-in-env-32chars!"
  console.warn("[auth] JWT_SECRET ausente ou curto — usando segredo de desenvolvimento.")
  return new TextEncoder().encode(fallback)
}
