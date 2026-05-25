import { redirect } from "next/navigation"

/** Alias de /dietas — bloqueio Premium aplicado no middleware. */
export default function NutricaoPage() {
  redirect("/dietas")
}
