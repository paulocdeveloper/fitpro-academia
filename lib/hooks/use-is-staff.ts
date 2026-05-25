"use client"

import { isStaffRole } from "@/lib/auth/roles"
import { useSessionUser } from "@/lib/hooks/use-session-user"

export function useIsStaff() {
  const { user, loading } = useSessionUser()
  return {
    user,
    loading,
    isStaff: user ? isStaffRole(user.role) : false,
    isAluno: user ? user.role === "aluno" : false,
  }
}
