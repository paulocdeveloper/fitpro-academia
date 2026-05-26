"use client"

import { useState } from "react"
import {
  Apple,
  Beef,
  ChevronDown,
  ChevronUp,
  Droplets,
  Flame,
  Plus,
  Target,
  Wheat,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { FoodScannerOpenButton } from "@/components/nutrition/food-scanner"
import {
  MACRO_COLORS,
  sumConsumo,
  type DietaPlano,
  type Refeicao,
} from "@/lib/nutrition/diet-types"

function RefeicaoCard({
  refeicao,
  onOpenScanner,
}: {
  refeicao: Refeicao
  onOpenScanner: () => void
}) {
  const [open, setOpen] = useState(false)
  const Icon = refeicao.icon
  const totalKcal = refeicao.alimentos.reduce((s, a) => s + a.kcal, 0)

  return (
    <div className="metric-card rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "var(--neon-dim)" }}
          >
            <Icon className="w-5 h-5 neon-text" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-sm">{refeicao.tipo}</p>
            <p className="text-xs text-muted-foreground">{refeicao.horario}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold neon-text">{totalKcal} kcal</span>
          {open ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {open && (
        <div style={{ borderTop: "1px solid var(--border)" }}>
          {refeicao.alimentos.length === 0 ? (
            <p className="px-4 py-6 text-sm text-center text-muted-foreground">
              Nenhum alimento nesta refeição. Use o escaneador para adicionar.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <span className="col-span-1">Alimento</span>
                <span>Quantidade</span>
                <span className="text-right">Calorias</span>
              </div>
              {refeicao.alimentos.map((al, i) => (
                <div
                  key={`${refeicao.id}-${i}`}
                  className="grid grid-cols-3 gap-2 px-4 py-2.5 text-sm hover:bg-secondary/30 transition-colors"
                  style={{ borderTop: "1px solid var(--border)" }}
                >
                  <span className="col-span-1 font-medium">{al.item}</span>
                  <span className="text-muted-foreground">{al.qtd}</span>
                  <span className="text-right text-muted-foreground">{al.kcal} kcal</span>
                </div>
              ))}
            </>
          )}
          <div
            className="px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            <span className="text-sm font-semibold">Total da refeição</span>
            <div className="flex items-center gap-3 justify-between sm:justify-end">
              <span className="text-sm font-semibold neon-text">{totalKcal} kcal</span>
              <FoodScannerOpenButton onOpen={onOpenScanner} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export type NutritionDashboardProps = {
  dieta: DietaPlano
  onOpenScanner: () => void
  onAddRefeicao?: () => void
  showStaffActions?: boolean
}

export function NutritionDashboard({
  dieta,
  onOpenScanner,
  onAddRefeicao,
  showStaffActions = false,
}: NutritionDashboardProps) {
  const consumo = sumConsumo(dieta.refeicoes)
  const totalKcal = consumo.kcal > 0 ? consumo.kcal : dieta.refeicoes.reduce((s, r) => s + r.alimentos.reduce((a, al) => a + al.kcal, 0), 0)
  const totalKcalSafe = Math.max(totalKcal, 1)

  const proteinasDisplay = consumo.proteinas > 0 ? Math.round(consumo.proteinas) : dieta.proteinas
  const carbosDisplay = consumo.carbos > 0 ? Math.round(consumo.carbos) : dieta.carbos
  const gordurasDisplay = consumo.gorduras > 0 ? Math.round(consumo.gorduras) : dieta.gorduras

  const refeicoesComAlimento = dieta.refeicoes.filter((r) => r.alimentos.length > 0).length

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-4xl mx-auto w-full">
      {/* Objetivo */}
      <div className="metric-card rounded-xl p-4 flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "var(--neon-dim)" }}
        >
          <Target className="w-5 h-5 neon-text" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Objetivo</p>
          <p className="font-semibold text-sm mt-0.5">{dieta.objetivo}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {refeicoesComAlimento} refeição(ões) registradas hoje · {dieta.refeicoes.length} slots no plano
          </p>
        </div>
      </div>

      {/* Macros resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {[
          { label: "Calorias", value: `${totalKcal} kcal`, icon: Flame, color: "var(--primary)" },
          { label: "Proteínas", value: `${proteinasDisplay}g`, icon: Beef, color: MACRO_COLORS.proteinas },
          { label: "Carboidratos", value: `${carbosDisplay}g`, icon: Wheat, color: MACRO_COLORS.carbos },
          { label: "Gorduras", value: `${gordurasDisplay}g`, icon: Droplets, color: MACRO_COLORS.gorduras },
        ].map((m) => (
          <div key={m.label} className="metric-card rounded-xl p-4 flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: `${m.color}20` }}
            >
              <m.icon className="w-4 h-4" style={{ color: m.color }} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{m.label}</p>
              <p
                className="font-bold text-lg"
                style={{ fontFamily: "var(--font-space-grotesk)", color: m.color }}
              >
                {m.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Distribuição */}
      <div className="metric-card rounded-xl p-5 space-y-4">
        <h3 className="font-semibold" style={{ fontFamily: "var(--font-space-grotesk)" }}>
          Distribuição de macros
        </h3>
        <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
          {[
            { pct: (proteinasDisplay * 4 / totalKcalSafe) * 100, color: MACRO_COLORS.proteinas },
            { pct: (carbosDisplay * 4 / totalKcalSafe) * 100, color: MACRO_COLORS.carbos },
            { pct: (gordurasDisplay * 9 / totalKcalSafe) * 100, color: MACRO_COLORS.gorduras },
          ].map((m, i) => (
            <div
              key={i}
              className="h-full rounded-sm transition-all min-w-[2px]"
              style={{ width: `${Math.max(m.pct, 0)}%`, background: m.color }}
            />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs">
          {[
            {
              label: "Proteínas",
              pct: Math.round((proteinasDisplay * 4 / totalKcalSafe) * 100),
              color: MACRO_COLORS.proteinas,
            },
            {
              label: "Carboidratos",
              pct: Math.round((carbosDisplay * 4 / totalKcalSafe) * 100),
              color: MACRO_COLORS.carbos,
            },
            {
              label: "Gorduras",
              pct: Math.round((gordurasDisplay * 9 / totalKcalSafe) * 100),
              color: MACRO_COLORS.gorduras,
            },
          ].map((m) => (
            <div key={m.label} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: m.color }} />
              <span className="text-muted-foreground">{m.label}</span>
              <span className="font-semibold">{m.pct}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Plano + refeições */}
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="font-semibold" style={{ fontFamily: "var(--font-space-grotesk)" }}>
            Plano alimentar — {dieta.aluno}
          </h3>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {showStaffActions && onAddRefeicao && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="gap-2 text-xs neon-text hover:bg-primary/10 justify-center sm:justify-start"
                onClick={onAddRefeicao}
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar refeição
              </Button>
            )}
            <FoodScannerOpenButton onOpen={onOpenScanner} />
          </div>
        </div>

        {dieta.refeicoes.length === 0 ? (
          <div className="metric-card rounded-xl p-8 text-center text-sm text-muted-foreground">
            Nenhuma refeição no plano. Adicione uma refeição ou escaneie um alimento.
          </div>
        ) : (
          dieta.refeicoes.map((r) => (
            <RefeicaoCard key={r.id} refeicao={r} onOpenScanner={onOpenScanner} />
          ))
        )}
      </div>

      {/* Histórico resumido */}
      {consumo.kcal > 0 && (
        <div className="metric-card rounded-xl p-4">
          <h3
            className="font-semibold text-sm mb-3"
            style={{ fontFamily: "var(--font-space-grotesk)" }}
          >
            Resumo do dia
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Calorias ingeridas</p>
              <p className="font-semibold neon-text">{Math.round(consumo.kcal)} kcal</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Proteínas</p>
              <p className="font-semibold">{Math.round(consumo.proteinas)} g</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Carboidratos</p>
              <p className="font-semibold">{Math.round(consumo.carbos)} g</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Gorduras</p>
              <p className="font-semibold">{Math.round(consumo.gorduras)} g</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
