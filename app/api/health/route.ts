import { existsSync } from "node:fs"
import { resolve } from "node:path"
import { NextResponse } from "next/server"
import { getDbConnectionInfo } from "@/lib/db-config"
import { mapDbConnectionError } from "@/lib/db-errors"
import { query } from "@/lib/db"
import { getEnvSummaryForHealth } from "@/lib/env"
import { isMercadoPagoConfigured } from "@/lib/mercadopago/config"
import { getOpenAIConfig } from "@/lib/nutrition/openai-config"

function envFilesStatus() {
  const names = [".env", ".env.local", ".env.development", ".env.production"]
  return names.map((name) => ({
    name,
    exists: existsSync(resolve(process.cwd(), name)),
    loadedByNext: name === ".env" || name === ".env.local",
  }))
}

function maskDatabaseUrl(raw: string | undefined) {
  if (!raw) return null
  try {
    const u = new URL(raw)
    if (u.password) u.password = "***"
    return u.toString()
  } catch {
    return "invalid"
  }
}

/** Verifica ligação Supabase PostgreSQL */
export async function GET() {
  const info = getDbConnectionInfo()
  try {
    const ping = await query<{ ok: number; db: string; user: string }>(
      "SELECT 1 AS ok, current_database() AS db, current_user AS user",
    )
    const master = await query<{ id: number; perfil: string }>(
      `SELECT id, perfil::text AS perfil FROM usuarios WHERE perfil IN ('master', 'admin') ORDER BY id LIMIT 1`,
    )
    return NextResponse.json({
      ok: true,
      dialect: "postgres",
      activeDatabase: "supabase-postgresql",
      envFilePrimary: resolve(process.cwd(), ".env"),
      envFiles: envFilesStatus(),
      connection: info,
      databaseUrlMasked: maskDatabaseUrl(process.env.DATABASE_URL),
      ping: ping[0],
      masterUser: master[0]
        ? { id: master[0].id, perfil: master[0].perfil, configured: true }
        : null,
      env: {
        ...getEnvSummaryForHealth(),
        DATABASE_URL_set: Boolean(process.env.DATABASE_URL),
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? null,
        NEXT_PUBLIC_SUPABASE_ANON_KEY_set: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
        DB_HOST: process.env.DB_HOST ?? null,
        DB_DATABASE: process.env.DB_DATABASE ?? null,
        MYSQL_URL: process.env.MYSQL_URL ?? null,
        OPENAI_API_KEY_set: getOpenAIConfig().configured,
        OPENAI_VISION_MODEL: getOpenAIConfig().model,
        MERCADOPAGO_ACCESS_TOKEN_set: isMercadoPagoConfigured(),
        MERCADOPAGO_WEBHOOK_SECRET_set: Boolean(process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim()),
        MERCADOPAGO_USE_MOCK: process.env.MERCADOPAGO_USE_MOCK === "true",
      },
    })
  } catch (e) {
    const mapped = mapDbConnectionError(e)
    return NextResponse.json(
      {
        ok: false,
        connection: info,
        env: {
          DB_DIALECT: process.env.DB_DIALECT ?? null,
          DATABASE_URL_set: Boolean(process.env.DATABASE_URL),
          DB_HOST: process.env.DB_HOST ?? null,
          DB_DATABASE: process.env.DB_DATABASE ?? null,
        },
        code: (e as { code?: string })?.code,
        message: e instanceof Error ? e.message : String(e),
        hint: mapped?.error ?? "Verifique DATABASE_URL no .env",
      },
      { status: 503 },
    )
  }
}
