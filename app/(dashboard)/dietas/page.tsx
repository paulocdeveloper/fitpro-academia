"use client"

import { useState, type FormEvent } from "react"
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
import {
  Coffee,
  Sun,
  Apple,
  Moon,
  Plus,
  Flame,
  Beef,
  Wheat,
  Droplets,
  ChevronDown,
  ChevronUp,
  UtensilsCrossed,
} from "lucide-react"

type Alimento = {
  item: string
  qtd: string
  kcal: number
  proteinas_g: number
  carboidratos_g: number
  gorduras_g: number
}

const dietasInicial = [
  {
    aluno: "Carlos Silva",
    objetivo: "Hipertrofia",
    proteinas: 180,
    carbos: 380,
    gorduras: 90,
    refeicoes: [
      { id: "ref-cafe", tipo: "Café da Manhã", horario: "07:00", icon: Coffee, alimentos: [
        { item: "Ovos mexidos (3 unidades)", qtd: "180g", kcal: 210 },
        { item: "Pão integral", qtd: "60g", kcal: 155 },
        { item: "Banana", qtd: "120g", kcal: 108 },
        { item: "Whey Protein", qtd: "30g", kcal: 120 },
      ].map((a) => ({ ...a, proteinas_g: 0, carboidratos_g: 0, gorduras_g: 0 })) as Alimento[]},
      { id: "ref-almoco", tipo: "Almoço", horario: "12:00", icon: Sun, alimentos: [
        { item: "Frango grelhado", qtd: "200g", kcal: 330 },
        { item: "Arroz integral", qtd: "150g", kcal: 210 },
        { item: "Feijão carioca", qtd: "100g", kcal: 130 },
        { item: "Salada verde", qtd: "100g", kcal: 30 },
        { item: "Azeite de oliva", qtd: "10ml", kcal: 90 },
      ].map((a) => ({ ...a, proteinas_g: 0, carboidratos_g: 0, gorduras_g: 0 })) as Alimento[]},
      { id: "ref-lanche", tipo: "Lanche", horario: "15:30", icon: Apple, alimentos: [
        { item: "Batata doce cozida", qtd: "150g", kcal: 162 },
        { item: "Peito de frango", qtd: "100g", kcal: 165 },
        { item: "Castanhas", qtd: "30g", kcal: 196 },
      ].map((a) => ({ ...a, proteinas_g: 0, carboidratos_g: 0, gorduras_g: 0 })) as Alimento[]},
      { id: "ref-jantar", tipo: "Jantar", horario: "19:30", icon: Moon, alimentos: [
        { item: "Salmão grelhado", qtd: "200g", kcal: 376 },
        { item: "Brócolis no vapor", qtd: "150g", kcal: 51 },
        { item: "Batata doce", qtd: "150g", kcal: 162 },
        { item: "Azeite de oliva", qtd: "10ml", kcal: 90 },
      ].map((a) => ({ ...a, proteinas_g: 0, carboidratos_g: 0, gorduras_g: 0 })) as Alimento[]},
    ],
  },
]

const macroColors = {
  proteinas: "oklch(0.7 0.22 145)",
  carbos: "oklch(0.75 0.18 80)",
  gorduras: "oklch(0.65 0.2 200)",
}

type Refeicao = {
  id: string
  tipo: string
  horario: string
  icon: React.ElementType
  alimentos: Alimento[]
}

function RefeicaoCard({
  refeicao,
  onFoodAdded,
}: {
  refeicao: Refeicao
  onFoodAdded: (food: ScannedFood) => void
}) {
  const [open, setOpen] = useState(false)
  const Icon = refeicao.icon
  const totalKcal = refeicao.alimentos.reduce((s, a) => s + a.kcal, 0)

  return (
    <div className="metric-card rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--neon-dim)" }}>
            <Icon className="w-5 h-5 neon-text" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-sm">{refeicao.tipo}</p>
            <p className="text-xs text-muted-foreground">{refeicao.horario}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold neon-text">{totalKcal} kcal</span>
          {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {open && (
        <div style={{ borderTop: "1px solid var(--border)" }}>
          <div className="grid grid-cols-3 gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <span className="col-span-1">Alimento</span>
            <span>Quantidade</span>
            <span className="text-right">Calorias</span>
          </div>
          {refeicao.alimentos.map((al, i) => (
            <div
              key={i}
              className="grid grid-cols-3 gap-2 px-4 py-2.5 text-sm hover:bg-secondary/30 transition-colors"
              style={{ borderTop: "1px solid var(--border)" }}
            >
              <span className="col-span-1 font-medium">{al.item}</span>
              <span className="text-muted-foreground">{al.qtd}</span>
              <span className="text-right text-muted-foreground">{al.kcal} kcal</span>
            </div>
          ))}
          <div
            className="px-4 py-3 flex items-center justify-between"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            <span className="text-sm font-semibold">Total da refeição</span>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold neon-text">{totalKcal} kcal</span>
              <FoodScanner onAddFood={onFoodAdded} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function newRefeicaoId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `ref-${crypto.randomUUID()}`
  }
  return `ref-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export default function DietasPage() {
  const [dietaData, setDietaData] = useState(dietasInicial)
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

  const dieta = dietaData[0]
  const totalKcal = dieta.refeicoes.reduce((s, r) => r.alimentos.reduce((a, al) => a + al.kcal, s), 0)
  const totalKcalSafe = Math.max(totalKcal, 1)

  const handleAdicionarRefeicao = (e: FormEvent) => {
    e.preventDefault()
    const nome = novaRefeicaoNome.trim()
    if (!nome) {
      setRefeicaoFormError("Informe o nome da refeição.")
      return
    }
    setRefeicaoFormError(null)

    setDietaData((prev) => {
      const d = { ...prev[0] }
      d.refeicoes = [
        ...d.refeicoes,
        {
          id: newRefeicaoId(),
          tipo: nome,
          horario: novaRefeicaoHorario,
          icon: UtensilsCrossed,
          alimentos: [] as Alimento[],
        },
      ]
      return [d]
    })
    resetRefeicaoForm()
    setAddRefeicaoOpen(false)
  }

  const handleFoodAdded = (food: ScannedFood) => {
    // Adiciona à primeira refeição aberta (Café da Manhã por padrão)
    setDietaData(prev => {
      const updated = { ...prev[0] }
      updated.refeicoes = updated.refeicoes.map((r, i) =>
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
          : r
      )
      return [updated]
    })
  }

  return (
    <div>
      <Navbar
        title="Nutrição"
        subtitle="Gestão de dietas e planos alimentares"
        action={{
          label: "Nova Dieta",
          onClick: openNovaRefeicao,
        }}
      />

      <div className="p-6 space-y-5">
        {/* Macro resumo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Calorias Totais", value: `${totalKcal} kcal`, icon: Flame, color: "var(--primary)" },
            { label: "Proteínas", value: `${dieta.proteinas}g`, icon: Beef, color: macroColors.proteinas },
            { label: "Carboidratos", value: `${dieta.carbos}g`, icon: Wheat, color: macroColors.carbos },
            { label: "Gorduras", value: `${dieta.gorduras}g`, icon: Droplets, color: macroColors.gorduras },

          ].map((m) => (
            <div key={m.label} className="metric-card rounded-xl p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${m.color}20` }}>
                <m.icon className="w-4 h-4" style={{ color: m.color }} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{m.label}</p>
                <p className="font-bold text-lg" style={{ fontFamily: "var(--font-space-grotesk)", color: m.color }}>{m.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Macro progress bars */}
        <div className="metric-card rounded-xl p-5 space-y-4">
          <h3 className="font-semibold" style={{ fontFamily: "var(--font-space-grotesk)" }}>Distribuição de Macros</h3>
          <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
            {[
              { pct: (dieta.proteinas * 4 / totalKcalSafe) * 100, color: macroColors.proteinas },
              { pct: (dieta.carbos * 4 / totalKcalSafe) * 100, color: macroColors.carbos },
              { pct: (dieta.gorduras * 9 / totalKcalSafe) * 100, color: macroColors.gorduras },
            ].map((m, i) => (
              <div key={i} className="h-full rounded-sm transition-all" style={{ width: `${m.pct}%`, background: m.color }} />
            ))}
          </div>
          <div className="flex items-center gap-6 text-xs">
            {[
              { label: "Proteínas", pct: Math.round((dieta.proteinas * 4 / totalKcalSafe) * 100), color: macroColors.proteinas },
              { label: "Carboidratos", pct: Math.round((dieta.carbos * 4 / totalKcalSafe) * 100), color: macroColors.carbos },
              { label: "Gorduras", pct: Math.round((dieta.gorduras * 9 / totalKcalSafe) * 100), color: macroColors.gorduras },
            ].map(m => (
              <div key={m.label} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: m.color }} />
                <span className="text-muted-foreground">{m.label}</span>
                <span className="font-semibold">{m.pct}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Refeições */}
        <div className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="font-semibold" style={{ fontFamily: "var(--font-space-grotesk)" }}>Plano Alimentar — {dieta.aluno}</h3>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="gap-2 text-xs neon-text hover:bg-primary/10 justify-center sm:justify-start"
                onClick={openNovaRefeicao}
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar Refeição
              </Button>
              <FoodScanner onAddFood={handleFoodAdded} />
            </div>
          </div>
          {dieta.refeicoes.map((r) => (
            <RefeicaoCard key={r.id} refeicao={r} onFoodAdded={handleFoodAdded} />
          ))}
        </div>
      </div>

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
                Defina o nome e o horário. Depois você pode incluir alimentos ao expandir a refeição ou usar o escaneador.
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
    </div>
  )
}
