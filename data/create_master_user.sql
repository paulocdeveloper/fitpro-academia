-- Script MySQL/MariaDB para HeidiSQL
-- Cria a tabela de usuarios (caso nao exista) e garante um usuario master.

USE academia;

CREATE TABLE IF NOT EXISTS usuarios (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nome VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL,
  senha_hash VARCHAR(255) NOT NULL,
  perfil ENUM('master','admin','personal','aluno') NOT NULL DEFAULT 'aluno',
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_usuarios_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Se a tabela ja existia com estrutura antiga, garante as colunas necessarias.
SET @has_perfil := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'usuarios'
    AND COLUMN_NAME = 'perfil'
);
SET @sql_perfil := IF(
  @has_perfil = 0,
  "ALTER TABLE usuarios ADD COLUMN perfil ENUM('master','admin','personal','aluno') NOT NULL DEFAULT 'aluno'",
  "SELECT 1"
);
PREPARE stmt_perfil FROM @sql_perfil;
EXECUTE stmt_perfil;
DEALLOCATE PREPARE stmt_perfil;

SET @has_ativo := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'usuarios'
    AND COLUMN_NAME = 'ativo'
);
SET @sql_ativo := IF(
  @has_ativo = 0,
  "ALTER TABLE usuarios ADD COLUMN ativo TINYINT(1) NOT NULL DEFAULT 1",
  "SELECT 1"
);
PREPARE stmt_ativo FROM @sql_ativo;
EXECUTE stmt_ativo;
DEALLOCATE PREPARE stmt_ativo;

-- Hash bcrypt para senha: Master@123 (gerado com bcryptjs cost 10; gere outro em producao)
UPDATE usuarios
SET
  nome = 'Usuario Master',
  senha_hash = '$2a$10$sBi/Gk7ejnRzfLqz2LMnbuavDy/HQOuZzfx8luX0hcchYUKsHlAy6',
  perfil = 'master',
  ativo = 1
WHERE email = 'master@academia.com';

INSERT INTO usuarios (nome, email, senha_hash, perfil, ativo)
SELECT
  'Usuario Master',
  'master@academia.com',
  '$2a$10$sBi/Gk7ejnRzfLqz2LMnbuavDy/HQOuZzfx8luX0hcchYUKsHlAy6',
  'master',
  1
WHERE NOT EXISTS (
  SELECT 1 FROM usuarios WHERE email = 'master@academia.com'
);
