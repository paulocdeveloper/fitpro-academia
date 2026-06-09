/** E-mail exclusivo do administrador da plataforma FitPro. */
export const MASTER_EMAIL = "master@academia.com"

export function isMasterEmail(email: string | null | undefined): boolean {
  return (email ?? "").trim().toLowerCase() === MASTER_EMAIL
}
