"use client"

import type { DetectedFoodItem, MacroLevel, MealAnalysisResult } from "@/lib/nutrition/types"
import { Button } from "@/components/ui/button"
import { Check, Plus, RefreshCw, Sparkles, X } from "lucide-react"
import type { ScannedFood } from "@/components/nutrition/food-scanner"

const LEVEL_LABEL: Record<MacroLevel, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
}

const QUALITY_LABEL: Record<MealAnalysisResult["qualidade_refeicao"], string> = {
  excelente: "Excelente",
  boa: "Boa",
  regular: "Regular",
  pobre: "Pobre",
}

const LEVEL_COLOR: Record<MacroLevel, string> = {
  baixa: "oklch(0.65 0.2 200)",
  media: "oklch(0.75 0.18 80)",
  alta: "oklch(0.7 0.22 145)",
}

const CATEGORY_LABEL: Record<string, string> = {
  proteina: "Proteina",
  carboidrato: "Carboidrato",
  gordura: "Gordura",
  fibra: "Fibras",
  vegetal: "Vegetais",
  bebida: "Bebida",
  industrializado: "Industrializado",
  doce: "Doce",
  fast_food: "Fast food",
}

function MacroBadge({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-xl p-3 gap-0.5"
      style={{ background: `${color}18`, border: `1px solid ${color}30` }}
    >
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-bold text-base" style={{ color, fontFamily: "var(--font-space-grotesk)" }}>
        {value}
        <span className="text-xs font-normal ml-0.5">{unit}</span>
      </span>
    </div>
  )
}

function LevelPill({ label, level }: { label: string; level: MacroLevel }) {
  return (
    <div
      className="flex flex-1 flex-col items-center rounded-xl px-2 py-2.5 gap-0.5 min-w-0"
      style={{ background: `${LEVEL_COLOR[level]}15`, border: `1px solid ${LEVEL_COLOR[level]}35` }}
    >
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-sm font-bold" style={{ color: LEVEL_COLOR[level] }}>
        {LEVEL_LABEL[level]}
      </span>
    </div>
  )
}

export function FoodScannerResults({
  analysis,
  previewImage,
  onAddItem,
  onAddPlate,
  onRetry,
  onClose,
}: {
  analysis: MealAnalysisResult
  previewImage: string | null
  onAddItem: (item: DetectedFoodItem) => void
  onAddPlate: () => void
  onRetry: () => void
  onClose: () => void
}) {
  const { totais, niveis, items, confianca_geral, qualidade_refeicao, resumo, engine, model } = analysis
  const engineLabel = engine === "openai" ? (model ?? "GPT-4o Vision") : "Análise visual"

  return (
    <div className="space-y-4 max-h-[min(70vh,520px)] overflow-y-auto pr-1">
      {previewImage && (
        <div className="relative rounded-xl overflow-hidden aspect-video bg-black">
          <img src={previewImage} alt="Prato capturado" className="w-full h-full object-cover" />
          <div
            className="absolute top-2 left-2 rounded-full px-2.5 py-1 text-[10px] font-semibold flex items-center gap-1"
            style={{ background: "oklch(0.05 0.005 260 / 0.85)", color: "var(--primary)" }}
          >
            <Sparkles className="w-3 h-3" />
            {confianca_geral}% · {engineLabel}
          </div>
          <div
            className="absolute bottom-2 right-2 rounded-full px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide"
            style={{ background: "oklch(0.05 0.005 260 / 0.75)", color: "var(--foreground)" }}
          >
            {items.length} item{items.length !== 1 ? "s" : ""}
          </div>
        </div>
      )}

      <div
        className="rounded-xl p-4 space-y-3"
        style={{ background: "var(--neon-dim)", border: "1px solid var(--primary)30" }}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 neon-glow"
            style={{ background: "var(--primary)" }}
          >
            <Sparkles className="w-5 h-5" style={{ color: "var(--primary-foreground)" }} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-sm" style={{ fontFamily: "var(--font-space-grotesk)" }}>
              {resumo}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Qualidade nutricional: {QUALITY_LABEL[qualidade_refeicao]}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="font-bold text-xl neon-text" style={{ fontFamily: "var(--font-space-grotesk)" }}>
              {totais.kcal}
            </p>
            <p className="text-[10px] text-muted-foreground">kcal est.</p>
          </div>
        </div>

        <div className="flex gap-2">
          <LevelPill label="Proteina" level={niveis.proteina} />
          <LevelPill label="Carbo" level={niveis.carboidrato} />
          <LevelPill label="Gordura" level={niveis.gordura} />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <MacroBadge label="Proteinas" value={totais.proteinas_g} unit="g" color="oklch(0.7 0.22 145)" />
          <MacroBadge label="Carbos" value={totais.carboidratos_g} unit="g" color="oklch(0.75 0.18 80)" />
          <MacroBadge label="Gorduras" value={totais.gorduras_g} unit="g" color="oklch(0.65 0.2 200)" />
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Alimentos detectados ({items.length})
        </p>
        {items.map((item, idx) => (
          <div key={`${item.nome}-${idx}`} className="metric-card rounded-xl p-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{item.nome}</p>
              <p className="text-[11px] text-muted-foreground">
                {item.categorias.map((c) => CATEGORY_LABEL[c] ?? c).join(" | ")} | ~{item.quantidade_g}g | {item.confianca}%
              </p>
              <p className="text-[11px] mt-0.5">
                P {item.proteinas_g}g | C {item.carboidratos_g}g | G {item.gorduras_g}g | {item.kcal} kcal
              </p>
            </div>
            <Button size="sm" variant="outline" className="shrink-0 h-8 gap-1 text-xs" onClick={() => onAddItem(item)}>
              <Plus className="w-3 h-3" /> Add
            </Button>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 pt-1">
        <Button
          className="w-full gap-2 font-semibold neon-glow"
          style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
          onClick={onAddPlate}
        >
          <Check className="w-4 h-4" />
          Adicionar prato completo
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 gap-2" onClick={onRetry}>
            <RefreshCw className="w-4 h-4" /> Nova captura
          </Button>
          <Button variant="outline" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export function itemToScannedFood(item: DetectedFoodItem): ScannedFood {
  return {
    nome: item.nome,
    quantidade_g: item.quantidade_g,
    calorias_kcal: item.kcal,
    proteinas_g: item.proteinas_g,
    carboidratos_g: item.carboidratos_g,
    gorduras_g: item.gorduras_g,
  }
}

export function plateToScannedFood(analysis: MealAnalysisResult): ScannedFood {
  const nomes = analysis.items.map((i) => i.nome.split("(")[0].trim()).join(", ")
  return {
    nome: nomes.length > 60 ? `${nomes.slice(0, 57)}...` : nomes || "Prato analisado",
    quantidade_g: analysis.items.reduce((s, i) => s + i.quantidade_g, 0),
    calorias_kcal: analysis.totais.kcal,
    proteinas_g: analysis.totais.proteinas_g,
    carboidratos_g: analysis.totais.carboidratos_g,
    gorduras_g: analysis.totais.gorduras_g,
  }
}
