import bcrypt from "bcryptjs"
import { execute, query } from "@/lib/db"
import { normalizePhone } from "@/lib/auth/phone-normalize"

export type PasswordResetUser = {
  id: number
  email: string
  nome: string
}

export function generateResetCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export async function findUserByEmail(email: string): Promise<PasswordResetUser | null> {
  const normalized = email.trim().toLowerCase()
  if (!normalized) return null
  const rows = await query<{ id: number; email: string; nome: string; ativo: boolean | number }>(
    `SELECT id, email, nome, ativo FROM usuarios WHERE LOWER(email) = ? LIMIT 1`,
    [normalized],
  )
  const row = rows[0]
  if (!row || row.ativo === false || row.ativo === 0) return null
  return { id: row.id, email: row.email, nome: row.nome }
}

/** Telefone via cadastro de aluno (join por e-mail + academia). Sem coluna telefone em usuarios. */
export async function findUserByPhone(phone: string): Promise<PasswordResetUser | null> {
  const digits = normalizePhone(phone)
  if (digits.length < 10) return null

  const rows = await query<{ id: number; email: string; nome: string }>(
    `SELECT u.id, u.email, u.nome
     FROM usuarios u
     INNER JOIN alunos a
       ON a.academia_id = u.academia_id
      AND LOWER(TRIM(COALESCE(a.email, ''))) = LOWER(TRIM(u.email))
     WHERE regexp_replace(COALESCE(a.telefone, ''), '[^0-9]', '', 'g') = ?
       AND (u.ativo IS TRUE OR u.ativo = 1)
     LIMIT 1`,
    [digits],
  )
  return rows[0] ?? null
}

export async function updateUserPassword(userId: number, plainPassword: string): Promise<void> {
  const hash = await bcrypt.hash(plainPassword, 10)
  await execute(`UPDATE usuarios SET senha_hash = ? WHERE id = ?`, [hash, userId])
}
