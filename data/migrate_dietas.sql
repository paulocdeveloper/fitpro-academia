-- Planos alimentares por academia (multi-tenant). Execute na sua base ou use `npm run db:bootstrap`.
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
