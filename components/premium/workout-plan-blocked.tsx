"use client"

import Link from "next/link"
import { Salad, Dumbbell, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { WORKOUT_BLOCKED_MESSAGE } from "@/lib/premium/plan-access"
import { NUTRICAO_PLAN } from "@/lib/premium/types"

export function WorkoutPlanBlocked() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-6 px-6 py-16 text-center">
      <div
        className="flex h-16 w-16 items-center justify-center rounded-2xl"
        style={{ background: "var(--neon-dim)" }}
      >
        <Salad className="h-8 w-8 neon-text" />
      </div>
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          Plano {NUTRICAO_PLAN.name}
        </p>
        <h1 className="text-xl font-bold tracking-tight">Área não incluída no seu plano</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">{WORKOUT_BLOCKED_MESSAGE}</p>
      </div>
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
        <Button asChild variant="outline" className="gap-2">
          <Link href="/dietas">
            <Salad className="h-4 w-4" />
            Voltar à Nutrição
          </Link>
        </Button>
        <Button asChild className="gap-2" style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}>
          <Link href="/premium">
            <Dumbbell className="h-4 w-4" />
            Fazer upgrade
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  )
}
