/**
 * Corrige bases antigas: adiciona academia_id onde falta e preenche NULLs.
 * Uso (Ubuntu/WSL): npm run db:fix-saas
 * Requer Node 20.6+ e ficheiro .env
 */
import mysql from "mysql2/promise"

function requireEnv(name) {
  const v = process.env[name]
  if (v === undefined || String(v).trim() === "") {
    console.error(`Variável ausente: ${name}. Copie .env.example para .env.`)
    process.exit(1)
  }
  return v
}

requireEnv("DB_HOST")
requireEnv("DB_USER")
requireEnv("DB_DATABASE")
const DB_PASSWORD = process.env.DB_PASSWORD ?? ""

const host = process.env.DB_HOST
const port = Number(process.env.DB_PORT ?? 3306)
const user = process.env.DB_USER
const database = process.env.DB_DATABASE

function q(ident) {
  return `\`${String(ident).replace(/`/g, "")}\``
}

async function ensureAcademiaIdColumn(db, tableName, academiaId) {
  const [tabs] = await db.execute(
    `SELECT COUNT(*) AS c FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [tableName],
  )
  if (Number(tabs[0]?.c) === 0) return

  const [cols] = await db.execute(
    `SELECT COUNT(*) AS c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = 'academia_id'`,
    [tableName],
  )
  if (Number(cols[0]?.c) > 0) return

  console.log(`→ Adicionar ${tableName}.academia_id…`)
  await db.execute(`ALTER TABLE ${q(tableName)} ADD COLUMN academia_id INT UNSIGNED NULL`)
  await db.execute(`UPDATE ${q(tableName)} SET academia_id = ? WHERE academia_id IS NULL`, [academiaId])
  await db.execute(`ALTER TABLE ${q(tableName)} MODIFY COLUMN academia_id INT UNSIGNED NOT NULL`)
  try {
    await db.execute(
      `ALTER TABLE ${q(tableName)} ADD KEY idx_${String(tableName).replace(/[^a-z0-9_]/gi, "_")}_academia (academia_id)`,
    )
  } catch (e) {
    if (e.code !== "ER_DUP_KEYNAME") throw e
  }
  console.log(`   OK: ${tableName}`)
}

console.log("A ligar ao MySQL (fix SaaS)…")
const db = await mysql.createConnection({
  host,
  port,
  user,
  password: DB_PASSWORD,
  database,
})

await db.query(`
CREATE TABLE IF NOT EXISTS academias (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nome VARCHAR(200) NOT NULL,
  slug VARCHAR(80) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_academias_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`)

const [acLista] = await db.query("SELECT id FROM academias ORDER BY id ASC LIMIT 1")
let academiaId = acLista[0]?.id
if (!academiaId) {
  const [ins] = await db.execute("INSERT INTO academias (nome) VALUES (?)", ["Academia padrão"])
  academiaId = ins.insertId
  console.log("Academia padrão criada, id:", academiaId)
} else {
  console.log("Academia de referência, id:", academiaId)
}

for (const t of ["usuarios", "treinos", "alunos", "dietas", "alimentos"]) {
  await ensureAcademiaIdColumn(db, t, academiaId)
}

const [uRes] = await db.execute(
  "UPDATE usuarios SET academia_id = ? WHERE academia_id IS NULL OR academia_id < 1",
  [academiaId],
)
console.log("Linhas em usuarios atualizadas (sem academia):", uRes.affectedRows ?? 0)

await db.end()
console.log("")
console.log("Concluído. Tente o login de novo. Se precisar: npm run db:seed-master")
