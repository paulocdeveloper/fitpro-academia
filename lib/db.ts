import mysql from "mysql2/promise"
import type { ResultSetHeader } from "mysql2"

const pool = mysql.createPool({
  host: process.env.DB_HOST ?? "127.0.0.1",
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? "root",
  password: process.env.DB_PASSWORD ?? "",
  database: process.env.DB_DATABASE ?? "academia",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
})

export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const [rows] = await pool.execute(sql, params)
  return rows as T[]
}

export async function execute(sql: string, params: any[] = []): Promise<number> {
  const [result] = await pool.execute(sql, params)
  return (result as ResultSetHeader).affectedRows
}

export async function insertRow(sql: string, params: any[] = []): Promise<number> {
  const [result] = await pool.execute(sql, params)
  return Number((result as ResultSetHeader).insertId)
}

/** Transação com uma conexão do pool (ex.: registro academia + usuário). */
export async function withTransaction<T>(fn: (conn: mysql.PoolConnection) => Promise<T>): Promise<T> {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const out = await fn(conn)
    await conn.commit()
    return out
  } catch (e) {
    await conn.rollback()
    throw e
  } finally {
    conn.release()
  }
}