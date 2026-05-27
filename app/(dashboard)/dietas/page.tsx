"use client"

import { useMemo, useState, useEffect, type FormEvent } from "react"
import { Navbar } from "@/components/layout/navbar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FoodScanner, type ScannedFood } from "@/components/nutrition/food-scanner"
import { NutritionDashboard } from "@/components/nutrition/nutrition-dashboard"
import { FitnessCoachChat } from "@/components/fitness-ai/fitness-coach-chat"
import { useIsStaff } from "@/lib/hooks/use-is-staff"
import {
  createDemoDieta,
  createFitnessDieta,
  type DietaPlano,
} from "@/lib/nutrition/diet-types"
import { Apple, Coffee, Moon, Sun, UtensilsCrossed, Sparkles, type LucideIcon } from "lucide-react"

const REFEICAO_ICONS: LucideIcon[] = [Coffee, Sun, Apple, Moon]

function hydrateDietaFromApi(raw: DietaPlano): DietaPlano {
  return {
    ...raw,
    refeicoes: raw.refeicoes.map((r, i) => ({
      ...r,
      icon: REFEICAO_ICONS[i % REFEICAO_ICONS.length] ?? UtensilsCrossed,
    })),
  }
}

function newRefeicaoId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `ref-${crypto.randomUUID()}`
  }
  return `ref-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export default function DietasPage() {
  const { isStaff, isFitness, user } = useIsStaff()
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [planLoading, setPlanLoading] = useState(false)

  const initialDieta = useMemo(() => {
    if (isFitness && !isStaff) {
      return createFitnessDieta(user?.displayName ?? "Meu plano")
    }
    return createDemoDieta()
  }, [isFitness, isStaff, user?.displayName])

  const [dieta, setDieta] = useState<DietaPlano>(initialDieta)
  const [addRefeicaoOpen, setAddRefeicaoOpen] = useState(false)
  const [novaRefeicaoNome, setNovaRefeicaoNome] = useState("")
  const [novaRefeicaoHorario, setNovaRefeicaoHorario] = useState("08:00")
  const [refeicaoFormError, setRefeicaoFormError] = useState<string | null>(null)

  const resetRefeicaoForm = () => {
    setNovaRefeicaoNome("")
    setNovaRefeicaoHorario("08:00")
    setRefeicaoFormError(null)
  }

  const openNovaRefeicao = () => {
    resetRefeicaoForm()
    setAddRefeicaoOpen(true)
  }

  const handleAdicionarRefeicao = (e: FormEvent) => {
    e.preventDefault()
    const nome = novaRefeicaoNome.trim()
    if (!nome) {
      setRefeicaoFormError("Informe o nome da refeição.")
      return
    }
    setRefeicaoFormError(null)

    setDieta((prev) => ({
      ...prev,
      refeicoes: [
        ...prev.refeicoes,
        {
          id: newRefeicaoId(),
          tipo: nome,
          horario: novaRefeicaoHorario,
          icon: UtensilsCrossed,
          alimentos: [],
        },
      ],
    }))
    resetRefeicaoForm()
    setAddRefeicaoOpen(false)
  }

  const handleFoodAdded = (food: ScannedFood) => {
    setDieta((prev) => ({
      ...prev,
      refeicoes: prev.refeicoes.map((r, i) =>
        i === 0
          ? {
              ...r,
              alimentos: [
                ...r.alimentos,
                {
                  item: food.nome,
                  qtd: `${food.quantidade_g}g`,
                  kcal: food.calorias_kcal,
                  proteinas_g: food.proteinas_g,
                  carboidratos_g: food.carboidratos_g,
                  gorduras_g: food.gorduras_g,
                },
              ],
            }
          : r,
      ),
    }))
  }

  const isFitnessUser = isFitness && !isStaff

  useEffect(() => {
    if (isFitnessUser && user?.displayName) {
      setDieta((prev) => ({ ...prev, aluno: user.displayName }))
    }
  }, [isFitnessUser, user?.displayName])

  useEffect(() => {
    if (!isFitnessUser || isStaff) return
    let cancelled = false
    setPlanLoading(true)
    void fetch("/api/nutrition/plan", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !data?.plano) return
        setDieta(hydrateDietaFromApi(data.plano as DietaPlano))
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setPlanLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [isFitnessUser, isStaff])

  const subtitle = isFitnessUser
    ? user
      ? `Olá, ${user.displayName.split(" ")[0]} — nutrição IA personalizada`
      : "Nutrição IA personalizada"
    : "Gestão de dietas e planos alimentares"

  return (
    <div>
      <Navbar
        title="Nutrição"
        subtitle={subtitle}
        action={
          isStaff
            ? { label: "Nova Dieta", onClick: openNovaRefeicao }
            : undefined
        }
      />

      {planLoading && isFitnessUser && (
        <p className="px-4 md:px-6 text-xs text-muted-foreground flex items-center gap-2 max-w-4xl mx-auto">
          <Sparkles className="w-3.5 h-3.5 animate-pulse text-primary" />
          Gerando plano alimentar pelo seu objetivo…
        </p>
      )}

      <div className="p-4 md:p-6 max-w-4xl mx-auto w-full space-y-5">
        {!isStaff && (
          <FitnessCoachChat compact />
        )}

        <NutritionDashboard
          dieta={dieta}
          onOpenScanner={() => setIsScannerOpen(true)}
          onAddRefeicao={isStaff ? openNovaRefeicao : undefined}
          showStaffActions={isStaff}
        />
      </div>

      {isScannerOpen && (
        <FoodScanner
          open={isScannerOpen}
          onOpenChange={setIsScannerOpen}
          hideTrigger
          onAddFood={handleFoodAdded}
        />
      )}

      {isStaff && (
        <Dialog
          open={addRefeicaoOpen}
          onOpenChange={(open) => {
            setAddRefeicaoOpen(open)
            if (!open) resetRefeicaoForm()
          }}
        >
          <DialogContent className="sm:max-w-md">
            <form onSubmit={handleAdicionarRefeicao}>
              <DialogHeader>
                <DialogTitle>Nova refeição</DialogTitle>
                <DialogDescription>
                  Defina o nome e o horário. Depois você pode incluir alimentos ao expandir a
                  refeição ou usar o escaneador.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                {refeicaoFormError && (
                  <p className="text-sm text-destructive" role="alert">
                    {refeicaoFormError}
                  </p>
                )}
                <div className="grid gap-2">
                  <Label htmlFor="refeicao-nome">Nome da refeição</Label>
                  <Input
                    id="refeicao-nome"
                    placeholder="Ex.: Pré-treino, Ceia…"
                    value={novaRefeicaoNome}
                    onChange={(e) => {
                      setNovaRefeicaoNome(e.target.value)
                      if (refeicaoFormError) setRefeicaoFormError(null)
                    }}
                    autoFocus
                    aria-invalid={!!refeicaoFormError}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="refeicao-horario">Horário</Label>
                  <Input
                    id="refeicao-horario"
                    type="time"
                    value={novaRefeicaoHorario}
                    onChange={(e) => setNovaRefeicaoHorario(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setAddRefeicaoOpen(false)
                    resetRefeicaoForm()
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" className="neon-text bg-primary text-primary-foreground hover:bg-primary/90">
                  Adicionar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
