import bcrypt from "bcryptjs"
import mysql from "mysql2/promise"
import { requireDbConfig } from "./db-env.mjs"

const { database: DB_DATABASE, poolOptions } = requireDbConfig()

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

  console.log(`Migração SaaS: a adicionar ${tableName}.academia_id…`)
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
  console.log(`  → ${tableName}.academia_id OK`)
}

console.log("A ligar ao MySQL…")
const admin = await mysql.createConnection({
  ...poolOptions,
  database: undefined,
})

try {
  await admin.query(
    `CREATE DATABASE IF NOT EXISTS ${q(DB_DATABASE)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  )
  console.log("Base OK:", DB_DATABASE)
} catch (e) {
  console.error("Não foi possível criar a base. Use DB_DATABASE no .env.")
  throw e
}
await admin.end()

const db = await mysql.createConnection(poolOptions)

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
console.log("Tabela academias OK")

const [acLista] = await db.query("SELECT id FROM academias ORDER BY id ASC LIMIT 1")
let academiaDemoId = acLista[0]?.id
if (!academiaDemoId) {
  const [ins] = await db.execute("INSERT INTO academias (nome) VALUES (?)", ["Academia Demo"])
  academiaDemoId = ins.insertId
  console.log("Academia demo criada, id:", academiaDemoId)
} else {
  console.log("Academia existente, id:", academiaDemoId)
}

await db.query(`
CREATE TABLE IF NOT EXISTS usuarios (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nome VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL,
  senha_hash VARCHAR(255) NOT NULL,
  perfil ENUM('master','admin','personal','aluno') NOT NULL DEFAULT 'aluno',
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  academia_id INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_usuarios_email (email),
  KEY idx_usuarios_academia (academia_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
`)
console.log("Tabela usuarios OK")
await ensureAcademiaIdColumn(db, "usuarios", academiaDemoId)

await db.query(`
CREATE TABLE IF NOT EXISTS treinos (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  academia_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  nome VARCHAR(200) NOT NULL,
  categoria VARCHAR(80) NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'ativo',
  exercicios LONGTEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_treinos_academia (academia_id),
  KEY idx_treinos_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`)
console.log("Tabela treinos OK")
await ensureAcademiaIdColumn(db, "treinos", academiaDemoId)

await db.query(`
CREATE TABLE IF NOT EXISTS alunos (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  academia_id INT UNSIGNED NOT NULL,
  nome VARCHAR(120) NOT NULL,
  email VARCHAR(160) NULL,
  telefone VARCHAR(40) NULL,
  objetivo VARCHAR(255) NULL,
  plano VARCHAR(120) NULL,
  status VARCHAR(40) NULL,
  peso DECIMAL(6,2) NULL,
  altura DECIMAL(5,2) NULL,
  PRIMARY KEY (id),
  KEY idx_alunos_academia (academia_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
`)
console.log("Tabela alunos OK")
await ensureAcademiaIdColumn(db, "alunos", academiaDemoId)

await db.query(`
CREATE TABLE IF NOT EXISTS dietas (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  academia_id INT UNSIGNED NOT NULL,
  aluno_id INT UNSIGNED NULL,
  titulo VARCHAR(200) NOT NULL,
  aluno_nome VARCHAR(120) NULL,
  objetivo VARCHAR(255) NULL,
  proteinas INT UNSIGNED NOT NULL DEFAULT 0,
  carbos INT UNSIGNED NOT NULL DEFAULT 0,
  gorduras INT UNSIGNED NOT NULL DEFAULT 0,
  refeicoes_json LONGTEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_dietas_academia (academia_id),
  KEY idx_dietas_aluno (aluno_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`)
console.log("Tabela dietas OK")
await ensureAcademiaIdColumn(db, "dietas", academiaDemoId)

await db.query(`
CREATE TABLE IF NOT EXISTS alimentos (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  academia_id INT UNSIGNED NOT NULL,
  nome VARCHAR(200) NOT NULL,
  kcal_100g INT UNSIGNED NOT NULL,
  proteinas_100g DECIMAL(6,2) NOT NULL DEFAULT 0,
  carbos_100g DECIMAL(6,2) NOT NULL DEFAULT 0,
  gorduras_100g DECIMAL(6,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_alimentos_academia (academia_id),
  KEY idx_alimentos_nome (nome)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`)
console.log("Tabela alimentos OK")

await db.query(`
CREATE TABLE IF NOT EXISTS planos_academia (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  academia_id INT UNSIGNED NOT NULL,
  slug VARCHAR(40) NOT NULL,
  nome VARCHAR(120) NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  duracao VARCHAR(40) NOT NULL DEFAULT 'Mensal',
  descricao VARCHAR(255) NULL,
  destaque TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_planos_acad_slug (academia_id, slug),
  KEY idx_planos_acad_academia (academia_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`)
console.log("Tabela planos_academia OK")

const planosSeed = [
  { slug: "basico", nome: "Básico", valor: 89.9, descricao: "Ideal para quem está começando", destaque: 0 },
  { slug: "premium", nome: "Premium", valor: 189.9, descricao: "O mais popular entre os alunos", destaque: 1 },
  { slug: "vip", nome: "VIP", valor: 299.9, descricao: "Experiência completa e exclusiva", destaque: 0 },
]
for (const p of planosSeed) {
  const [rows] = await db.execute(
    "SELECT id FROM planos_academia WHERE academia_id = ? AND slug = ? LIMIT 1",
    [academiaDemoId, p.slug],
  )
  if (rows?.[0]?.id) continue
  await db.execute(
    `INSERT INTO planos_academia (academia_id, slug, nome, valor, duracao, descricao, destaque)
     VALUES (?, ?, ?, ?, 'Mensal', ?, ?)`,
    [academiaDemoId, p.slug, p.nome, p.valor, p.descricao, p.destaque],
  )
}

await db.query(`
CREATE TABLE IF NOT EXISTS agenda_eventos (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  academia_id INT UNSIGNED NOT NULL,
  data_evento DATE NOT NULL,
  horario VARCHAR(5) NOT NULL,
  tipo ENUM('treino','avaliacao','nutricao') NOT NULL,
  aluno_nome VARCHAR(120) NOT NULL,
  aluno_id INT UNSIGNED NULL,
  duracao INT UNSIGNED NOT NULL DEFAULT 60,
  observacoes VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_agenda_academia_data (academia_id, data_evento),
  KEY idx_agenda_aluno (aluno_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`)
console.log("Tabela agenda_eventos OK")

try {
  const seed = [
    { nome: "Macarrão cozido", kcal: 160, p: 5.8, c: 30.9, g: 0.9 },
    { nome: "Carne moída cozida (média gordura)", kcal: 250, p: 26, c: 0, g: 16 },
    { nome: "Arroz branco cozido", kcal: 130, p: 2.5, c: 28.2, g: 0.3 },
    { nome: "Feijão cozido", kcal: 77, p: 4.8, c: 13.6, g: 0.5 },
    { nome: "Frango grelhado", kcal: 165, p: 31, c: 0, g: 3.6 },
    { nome: "Ovo cozido", kcal: 155, p: 13, c: 1.1, g: 11 },
    { nome: "Banana", kcal: 89, p: 1.1, c: 23, g: 0.3 },
  ]
  for (const s of seed) {
    const [rows] = await db.execute("SELECT id FROM alimentos WHERE academia_id = ? AND nome = ? LIMIT 1", [
      academiaDemoId,
      s.nome,
    ])
    if (rows?.[0]?.id) continue
    await db.execute(
      "INSERT INTO alimentos (academia_id, nome, kcal_100g, proteinas_100g, carbos_100g, gorduras_100g) VALUES (?, ?, ?, ?, ?, ?)",
      [academiaDemoId, s.nome, s.kcal, s.p, s.c, s.g],
    )
  }
} catch (e) {
  console.warn("Seed alimentos falhou (ok ignorar):", e?.code ?? e)
}

const plain = "Master@123"
const hash = await bcrypt.hash(plain, 10)
const emailKey = "master@academia.com"
const [rows] = await db.execute("SELECT id FROM usuarios WHERE LOWER(email) = ? LIMIT 1", [emailKey])
const existing = rows[0]
if (existing) {
  await db.execute(
    "UPDATE usuarios SET nome = ?, email = ?, senha_hash = ?, perfil = 'master', ativo = 1, academia_id = ? WHERE id = ?",
    ["Usuario Master", emailKey, hash, academiaDemoId, existing.id],
  )
  console.log("Utilizador master atualizado:", emailKey)
} else {
  await db.execute(
    "INSERT INTO usuarios (nome, email, senha_hash, perfil, ativo, academia_id) VALUES (?, ?, ?, 'master', 1, ?)",
    ["Usuario Master", emailKey, hash, academiaDemoId],
  )
  console.log("Utilizador master criado:", emailKey)
}

await db.end()
console.log("")
console.log("Bootstrap MySQL concluído. Login: master@academia.com / Master@123")
