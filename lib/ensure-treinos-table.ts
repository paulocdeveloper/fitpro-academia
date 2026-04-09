import { execute } from "@/lib/db"

/**
 * Cria a tabela `treinos` no mesmo schema que DB_DATABASE se ainda não existir.
 * Inclui `academia_id` para isolamento multi-tenant (SaaS).
 */
export async function ensureTreinosTable(): Promise<void> {
  const ddl = `
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
  `.trim()

  await execute(ddl, [])
}
