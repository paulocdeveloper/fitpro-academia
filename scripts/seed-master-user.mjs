/**
 * Define ou atualiza master@academia.com com senha Master@123 (hash bcrypt novo).
 * Uso: npm run db:seed-master
 * Requer Node 20.6+ (--env-file) ou defina DB_* no ambiente.
 */
import bcrypt from "bcryptjs"
import mysql from "mysql2/promise"

const EMAIL = "master@academia.com"
const PLAIN = "Master@123"

function requireEnv(name) {
  const v = process.env[name]
  if (v === undefined || String(v).trim() === "") {
    console.error(`Variável ausente: ${name}. Confira o ficheiro .env (veja .env.example).`)
    process.exit(1)
  }
  return v
}

requireEnv("DB_HOST")
requireEnv("DB_USER")
requireEnv("DB_DATABASE")

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD ?? "",
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 1,
})

const hash = await bcrypt.hash(PLAIN, 10)
if (!(await bcrypt.compare(PLAIN, hash))) {
  console.error("Falha interna: bcrypt.")
  process.exit(1)
}

const emailKey = EMAIL.toLowerCase()

const [acLista] = await pool.query("SELECT id FROM academias ORDER BY id ASC LIMIT 1")
let academiaId = acLista[0]?.id
if (!academiaId) {
  const [ins] = await pool.execute("INSERT INTO academias (nome) VALUES (?)", ["Academia padrão"])
  academiaId = ins.insertId
  console.log("Academia padrão criada, id:", academiaId)
}

const [rows] = await pool.execute("SELECT id FROM usuarios WHERE LOWER(email) = ? LIMIT 1", [emailKey])
const existing = rows[0]

if (existing) {
  await pool.execute(
    "UPDATE usuarios SET nome = ?, email = ?, senha_hash = ?, perfil = 'master', ativo = 1, academia_id = ? WHERE id = ?",
    ["Usuario Master", emailKey, hash, academiaId, existing.id],
  )
  console.log("Utilizador atualizado:", emailKey)
} else {
  await pool.execute(
    "INSERT INTO usuarios (nome, email, senha_hash, perfil, ativo, academia_id) VALUES (?, ?, ?, 'master', 1, ?)",
    ["Usuario Master", emailKey, hash, academiaId],
  )
  console.log("Utilizador criado:", emailKey)
}

await pool.end()
console.log("Senha definida:", PLAIN)
