import type { UserRole } from "./roles"
import { canViewAllTreinos } from "./roles"

export function canAccessTreino(role: UserRole, sessionUserId: number, treinoOwnerUserId: number): boolean {
  if (canViewAllTreinos(role)) return true
  return treinoOwnerUserId === sessionUserId
}

export function canMutateTreino(role: UserRole, sessionUserId: number, treinoOwnerUserId: number): boolean {
  if (canViewAllTreinos(role)) return true
  return treinoOwnerUserId === sessionUserId
}
