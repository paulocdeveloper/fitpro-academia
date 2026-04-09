-- FitPro — tabela de treinos vinculada ao usuário (usuarios.id) + RBAC na API
-- Execute no banco `academia` (HeidiSQL). Requer tabela `usuarios`.
-- Se já existe uma tabela `treinos` antiga (outros nomes de colunas), use migrate_treinos_fitpro.sql.

USE academia;

CREATE TABLE IF NOT EXISTS treinos (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL COMMENT 'Dono do treino (FK usuarios.id)',
  nome VARCHAR(200) NOT NULL,
  categoria VARCHAR(80) NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'ativo',
  exercicios JSON NULL COMMENT 'Array JSON de exercícios',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_treinos_user (user_id),
  CONSTRAINT fk_treinos_usuario FOREIGN KEY (user_id) REFERENCES usuarios (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Observação: em MySQL antigo sem JSON, troque `exercicios JSON` por `LONGTEXT` e grave JSON como texto.
