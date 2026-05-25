import { query } from "@/lib/db"

let ready: Promise<void> | null = null

/** Garante que o perfil `usuario` existe no enum/tabela (PostgreSQL Supabase). */
export function ensureUsuarioPerfilInDb(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      try {
        await query(`ALTER TYPE perfil_usuario ADD VALUE IF NOT EXISTS 'usuario'`)
      } catch {
        /* MySQL ou tipo já existe */
      }
      try {
        await query(
          `ALTER TABLE usuarios MODIFY perfil ENUM('master','admin','personal','aluno','usuario') NOT NULL DEFAULT 'aluno'`,
        )
      } catch {
        /* Postgres sem MODIFY */
      }
    })()
  }
  return ready
}
