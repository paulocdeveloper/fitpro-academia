"use client"

import { isFitnessRole, isStaffRole, isUsuarioRole } from "@/lib/auth/roles"
import { useSessionUser } from "@/lib/hooks/use-session-user"

export function useIsStaff() {
  const { user, loading } = useSessionUser()
  return {
    user,
    loading,
    isStaff: user ? isStaffRole(user.role) : false,
    isAluno: user ? user.role === "aluno" : false,
    isUsuario: user ? isUsuarioRole(user.role) : false,
    isFitness: user ? isFitnessRole(user.role) : false,
  }
}
