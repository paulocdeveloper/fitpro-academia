/**
 * Bloqueia ou desbloqueia usuário(s) por nome ou e-mail.
 * Uso:
 *   node ./scripts/block-user.mjs wendel
 *   node ./scripts/block-user.mjs --unblock wendel
 */
import pg from "pg"
import { loadEnvFile, resolvePostgresConfig } from "./db-env.mjs"

const args = process.argv.slice(2)
const unblock = args[0] === "--unblock" || args[0] === "unblock"
const term = (unblock ? args[1] : args[0])?.trim().toLowerCase()

if (!term) {
  console.error("Uso: node ./scripts/block-user.mjs [--unblock] <nome-ou-email>")
  process.exit(1)
}

loadEnvFile()
const cfg = resolvePostgresConfig()
const client = new pg.Client({
  connectionString: cfg.connectionString,
  ssl: cfg.host.includes("supabase") ? { rejectUnauthorized: false } : undefined,
})

const pattern = `%${term}%`

try {
  await client.connect()

  const find = await client.query(
    `SELECT id, nome, email, perfil::text AS perfil, ativo, created_at
     FROM usuarios
     WHERE lower(nome) LIKE $1 OR lower(email) LIKE $1
     ORDER BY id`,
    [pattern],
  )

  if (find.rowCount === 0) {
    console.error(`Nenhum usuário encontrado para "${term}".`)
    process.exit(1)
  }

  console.log(`Encontrados (${find.rowCount}):`)
  for (const r of find.rows) {
    console.log(`  #${r.id} ${r.nome} <${r.email}> perfil=${r.perfil} ativo=${r.ativo}`)
  }

  const upd = await client.query(
    `UPDATE usuarios SET ativo = $2, updated_at = now()
     WHERE lower(nome) LIKE $1 OR lower(email) LIKE $1
     RETURNING id, nome, email, ativo`,
    [pattern, unblock],
  )

  console.log(
    `\n✓ ${upd.rowCount} usuário(s) ${unblock ? "desbloqueado(s)" : "bloqueado(s)"}:`,
  )
  for (const r of upd.rows) {
    console.log(`  #${r.id} ${r.nome} <${r.email}> ativo=${r.ativo}`)
  }

  const alunos = await client.query(
    `UPDATE alunos SET status = $2, updated_at = now()
     WHERE lower(nome) LIKE $1 OR lower(email) LIKE $1
     RETURNING id, nome, email, status`,
    [pattern, unblock ? "ativo" : "inativo"],
  )

  if (alunos.rowCount > 0) {
    console.log(`\n✓ ${alunos.rowCount} registro(s) em alunos → status=${unblock ? "ativo" : "inativo"}:`)
    for (const r of alunos.rows) {
      console.log(`  #${r.id} ${r.nome} status=${r.status}`)
    }
  }
} catch (e) {
  console.error("Erro:", e.message ?? e)
  process.exit(1)
} finally {
  await client.end().catch(() => {})
}
