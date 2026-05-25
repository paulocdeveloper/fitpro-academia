import { Suspense } from "react"
import { MinhaAssinaturaView } from "@/components/assinatura/minha-assinatura-view"

export default function MinhaAssinaturaPage() {
  return (
    <Suspense
      fallback={
        <p className="p-8 text-center text-sm text-muted-foreground animate-pulse">
          Carregando assinatura…
        </p>
      }
    >
      <MinhaAssinaturaView />
    </Suspense>
  )
}
