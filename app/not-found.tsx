import type { Metadata } from "next"
import Link from "next/link"
import { privateRobots, siteName } from "@/lib/seo/site"

export const metadata: Metadata = {
  title: `Página não encontrada | ${siteName}`,
  robots: privateRobots,
}

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-bold">Página não encontrada</h1>
      <p className="text-muted-foreground max-w-md">
        O endereço que você acessou não existe ou foi movido.
      </p>
      <Link
        href="/login"
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        Ir para o login
      </Link>
    </main>
  )
}
