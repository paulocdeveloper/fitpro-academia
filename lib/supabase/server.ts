import { createClient } from "@supabase/supabase-js"

/**
 * Cliente Supabase server-side (service role — nunca expor no browser).
 * A app usa principalmente lib/db.ts (PostgreSQL direto) para queries.
 */
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
  if (!url || !serviceKey) {
    return null
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
