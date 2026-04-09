-- FitPro — alinhar tabela `treinos` ao schema esperado pela API.
-- Causa típica de ER_BAD_FIELD_ERROR: colunas com outros nomes (titulo, aluno_id) ou em falta.
-- Base: `usuarios` deve existir. Execute no banco configurado em DB_DATABASE (ex.: academia).

USE academia;

-- ---------------------------------------------------------------------------
-- A) Se existir aluno_id mas não user_id: copiar para user_id (RBAC + JOIN com usuarios)
-- ---------------------------------------------------------------------------
SET @u := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'treinos' AND COLUMN_NAME = 'user_id'
);
SET @a := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'treinos' AND COLUMN_NAME = 'aluno_id'
);

SET @s := IF(
  @u = 0 AND @a > 0,
  'ALTER TABLE treinos ADD COLUMN user_id INT UNSIGNED NULL AFTER id',
  'SELECT 1'
);
PREPARE p FROM @s;
EXECUTE p;
DEALLOCATE PREPARE p;

UPDATE treinos SET user_id = aluno_id
WHERE @u = 0 AND @a > 0 AND user_id IS NULL AND aluno_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- B) Se existir titulo mas não nome: criar nome e copiar
-- ---------------------------------------------------------------------------
SET @n := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'treinos' AND COLUMN_NAME = 'nome'
);
SET @t := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'treinos' AND COLUMN_NAME = 'titulo'
);

SET @s2 := IF(
  @n = 0 AND @t > 0,
  'ALTER TABLE treinos ADD COLUMN nome VARCHAR(200) NULL AFTER user_id',
  'SELECT 1'
);
PREPARE p2 FROM @s2;
EXECUTE p2;
DEALLOCATE PREPARE p2;

UPDATE treinos SET nome = titulo WHERE @n = 0 AND @t > 0 AND nome IS NULL;

-- ---------------------------------------------------------------------------
-- C) Colunas usadas pela API — execute linha a linha; ignore "Duplicate column" se já existir
-- ---------------------------------------------------------------------------
ALTER TABLE treinos ADD COLUMN categoria VARCHAR(80) NULL;
ALTER TABLE treinos ADD COLUMN status VARCHAR(40) NOT NULL DEFAULT 'ativo';
ALTER TABLE treinos ADD COLUMN exercicios JSON NULL;

-- MySQL sem tipo JSON: comente a linha acima e use:
-- ALTER TABLE treinos ADD COLUMN exercicios LONGTEXT NULL;

-- ---------------------------------------------------------------------------
-- D) Índice e FK (ignore se já existirem)
-- ---------------------------------------------------------------------------
ALTER TABLE treinos ADD KEY idx_treinos_user (user_id);

ALTER TABLE treinos
  ADD CONSTRAINT fk_treinos_usuario
  FOREIGN KEY (user_id) REFERENCES usuarios (id) ON DELETE CASCADE;

-- ---------------------------------------------------------------------------
-- Query final esperada (referência; a API adapta nomes via information_schema)
-- ---------------------------------------------------------------------------
-- SELECT t.id, t.user_id, t.nome, t.categoria, t.status, t.exercicios, u.nome AS aluno_nome
-- FROM treinos t
-- INNER JOIN usuarios u ON u.id = t.user_id
-- ORDER BY t.id DESC;
