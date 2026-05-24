/**
 * Bootstrap Supabase PostgreSQL apenas.
 * Uso: npm run db:bootstrap
 */
import { loadEnvFile } from "./db-env.mjs"

loadEnvFile()
await import("./bootstrap-supabase.mjs")
