-- FitPro SaaS: multi-academia (tenant)
-- Execute uma vez na base configurada em DB_DATABASE (ex.: HeidiSQL / mysql CLI).
-- Depois: peça novo login a todos os utilizadores (JWT passa a incluir academia_id).

CREATE TABLE IF NOT EXISTS academias (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nome VARCHAR(200) NOT NULL,
  slug VARCHAR(80) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_academias_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO academias (nome, slug)
SELECT 'Academia padrão', NULL
FROM (SELECT 1 AS x) AS d
WHERE NOT EXISTS (SELECT 1 FROM academias LIMIT 1);

SET @academia_padrao := (SELECT id FROM academias ORDER BY id ASC LIMIT 1);

-- usuarios.academia_id
SET @has_u_acad := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'academia_id'
);
SET @sql_u := IF(@has_u_acad = 0,
  'ALTER TABLE usuarios ADD COLUMN academia_id INT UNSIGNED NULL AFTER ativo',
  'SELECT 1');
PREPARE s_u FROM @sql_u;
EXECUTE s_u;
DEALLOCATE PREPARE s_u;

UPDATE usuarios SET academia_id = @academia_padrao WHERE academia_id IS NULL;

SET @sql_u2 := IF(@has_u_acad = 0,
  'ALTER TABLE usuarios MODIFY academia_id INT UNSIGNED NOT NULL, ADD KEY idx_usuarios_academia (academia_id)',
  'SELECT 1');
PREPARE s_u2 FROM @sql_u2;
EXECUTE s_u2;
DEALLOCATE PREPARE s_u2;

-- alunos.academia_id
SET @has_a_acad := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'alunos' AND COLUMN_NAME = 'academia_id'
);
SET @sql_a := IF(@has_a_acad = 0,
  'ALTER TABLE alunos ADD COLUMN academia_id INT UNSIGNED NULL AFTER id',
  'SELECT 1');
PREPARE s_a FROM @sql_a;
EXECUTE s_a;
DEALLOCATE PREPARE s_a;

UPDATE alunos SET academia_id = @academia_padrao WHERE academia_id IS NULL;

SET @sql_a2 := IF(@has_a_acad = 0,
  'ALTER TABLE alunos MODIFY academia_id INT UNSIGNED NOT NULL, ADD KEY idx_alunos_academia (academia_id)',
  'SELECT 1');
PREPARE s_a2 FROM @sql_a2;
EXECUTE s_a2;
DEALLOCATE PREPARE s_a2;

-- treinos.academia_id
SET @has_t_acad := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'treinos' AND COLUMN_NAME = 'academia_id'
);
SET @sql_t := IF(@has_t_acad = 0,
  'ALTER TABLE treinos ADD COLUMN academia_id INT UNSIGNED NULL AFTER id',
  'SELECT 1');
PREPARE s_t FROM @sql_t;
EXECUTE s_t;
DEALLOCATE PREPARE s_t;

UPDATE treinos SET academia_id = @academia_padrao WHERE academia_id IS NULL;

SET @sql_t2 := IF(@has_t_acad = 0,
  'ALTER TABLE treinos MODIFY academia_id INT UNSIGNED NOT NULL, ADD KEY idx_treinos_academia (academia_id)',
  'SELECT 1');
PREPARE s_t2 FROM @sql_t2;
EXECUTE s_t2;
DEALLOCATE PREPARE s_t2;
