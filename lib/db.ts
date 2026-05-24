import pg from "pg"
import {
  appendReturningId,
  tableExistsParams,
  tableExistsSql,
  toPgPlaceholders,
} from "@/lib/db-dialect"
import { getDbConnectionInfo, loadEnvFile, resolveDbConfig } from "@/lib/db-config"

export type { DbDialect } from "@/lib/db-config"
export { getDbDialect, resolveDbConfig, getDbConnectionInfo, isSupabaseConfigured, loadEnvFile } from "@/lib/db-config"

loadEnvFile()

export type DbExecutor = {
  query<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>
  execute(sql: string, params?: unknown[]): Promise<number>
  insertRow(sql: string, params?: unknown[]): Promise<number>
}

let pgPool: pg.Pool | null = null
let poolSignature: string | null = null

function pgPoolInstance(): pg.Pool {
  const cfg = resolveDbConfig()
  const sig = `${cfg.pgConnectionString}|${process.env.DB_SSL ?? ""}`
  if (pgPool && poolSignature === sig) return pgPool

  if (pgPool) {
    void pgPool.end().catch(() => {})
  }

  const useSsl =
    cfg.host.includes("supabase") ||
    process.env.DB_SSL === "true" ||
    process.env.NODE_ENV === "production"

  pgPool = new pg.Pool({
    connectionString: cfg.pgConnectionString,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    max: 10,
    connectionTimeoutMillis: 20_000,
  })
  poolSignature = sig

  if (process.env.NODE_ENV === "development") {
    const info = getDbConnectionInfo()
    console.info(
      "[db] Supabase PostgreSQL",
      `${info.user}@${info.host}:${info.port}/${info.database}`,
      `(schema: ${info.schema})`,
    )
  }

  return pgPool
}

async function runQuery<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const res = await pgPoolInstance().query(toPgPlaceholders(sql), params)
  return res.rows as T[]
}

async function runExecute(sql: string, params: unknown[] = []): Promise<number> {
  const res = await pgPoolInstance().query(toPgPlaceholders(sql), params)
  return res.rowCount ?? 0
}

async function runInsertRow(sql: string, params: unknown[] = []): Promise<number> {
  const insertSql = appendReturningId(sql, "postgres")
  const res = await pgPoolInstance().query<{ id: number }>(toPgPlaceholders(insertSql), params)
  return Number(res.rows[0]?.id)
}

export async function query<T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> {
  return runQuery<T>(sql, params)
}

export async function execute(sql: string, params: unknown[] = []): Promise<number> {
  return runExecute(sql, params)
}

export async function insertRow(sql: string, params: unknown[] = []): Promise<number> {
  return runInsertRow(sql, params)
}

export async function tableExists(tableName: string): Promise<boolean> {
  const cfg = resolveDbConfig()
  const rows = await query<{ c: number | string }>(
    tableExistsSql("postgres", cfg.schema, tableName),
    tableExistsParams("postgres", cfg.schema, tableName),
  )
  return Number(rows[0]?.c) > 0
}

const executor: DbExecutor = {
  query,
  execute,
  insertRow,
}

export async function withTransaction<T>(fn: (tx: DbExecutor) => Promise<T>): Promise<T> {
  const client = await pgPoolInstance().connect()
  const tx: DbExecutor = {
    async query<T>(sql: string, params: unknown[] = []) {
      const res = await client.query(toPgPlaceholders(sql), params)
      return res.rows as T[]
    },
    async execute(sql: string, params: unknown[] = []) {
      const res = await client.query(toPgPlaceholders(sql), params)
      return res.rowCount ?? 0
    },
    async insertRow(sql: string, params: unknown[] = []) {
      const insertSql = appendReturningId(sql, "postgres")
      const res = await client.query<{ id: number }>(toPgPlaceholders(insertSql), params)
      return Number(res.rows[0]?.id)
    },
  }
  try {
    await client.query("BEGIN")
    const out = await fn(tx)
    await client.query("COMMIT")
    return out
  } catch (e) {
    await client.query("ROLLBACK")
    throw e
  } finally {
    client.release()
  }
}

export { executor as db }
