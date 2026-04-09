-- FitPro Nutrição: tabela de alimentos por academia (macros por 100g).
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

