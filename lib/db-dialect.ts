export type DbDialect = "postgres"

export function quoteIdent(name: string, _dialect: DbDialect = "postgres"): string {
  const safe = String(name).replace(/"/g, '""')
  return `"${safe}"`
}

export function toPgPlaceholders(sql: string): string {
  let i = 0
  return sql.replace(/\?/g, () => `$${++i}`)
}

export function appendReturningId(sql: string, dialect: DbDialect = "postgres"): string {
  if (dialect !== "postgres") return sql
  const trimmed = sql.trim().replace(/;$/, "")
  if (/returning\s+/i.test(trimmed)) return trimmed
  return `${trimmed} RETURNING id`
}

export function tableExistsSql(dialect: DbDialect, schema: string, table: string): string {
  return `SELECT COUNT(*) AS c FROM information_schema.tables
          WHERE table_schema = ? AND table_name = ?`
}

export function tableExistsParams(_dialect: DbDialect, schema: string, table: string): unknown[] {
  return [schema || "public", table]
}
