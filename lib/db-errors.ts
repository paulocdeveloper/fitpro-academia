export function isMissingTable(e: unknown): boolean {
  const code = typeof e === "object" && e !== null ? (e as { code?: string }).code : undefined
  return code === "42P01"
}

export function isMissingColumn(e: unknown): boolean {
  const code = typeof e === "object" && e !== null ? (e as { code?: string }).code : undefined
  return code === "42703"
}

export function isDuplicateEntry(e: unknown): boolean {
  const err = e as { code?: string }
  return err.code === "23505"
}

export function mapDbConnectionError(e: unknown): { status: number; error: string } | null {
  if (!e || typeof e !== "object") return null
  const err = e as { code?: string; message?: string }
  const code = err.code
  const msg = typeof err.message === "string" ? err.message : ""

  if (code === "ECONNREFUSED" || code === "ENOTFOUND") {
    return {
      status: 503,
      error: "Não foi possível ligar ao Supabase. Confirme DATABASE_URL no .env e execute: npm run supabase:setup",
    }
  }
  if (code === "28P01") {
    return {
      status: 503,
      error: "Supabase recusou a password. Execute: npm run supabase:setup",
    }
  }
  if (code === "3D000" || /does not exist/i.test(msg)) {
    return {
      status: 503,
      error: "Base PostgreSQL inacessível. Use /postgres na DATABASE_URL. Execute: npm run supabase:setup",
    }
  }
  if (isMissingTable(e)) {
    return {
      status: 503,
      error: "Tabelas em falta. Execute: npm run db:bootstrap",
    }
  }
  if (isMissingColumn(e)) {
    return {
      status: 503,
      error: "Schema desatualizado. Execute: npm run db:bootstrap",
    }
  }
  if (msg.includes("Supabase não configurado") || msg.includes("DATABASE_URL inválida")) {
    return { status: 503, error: msg }
  }
  return null
}
