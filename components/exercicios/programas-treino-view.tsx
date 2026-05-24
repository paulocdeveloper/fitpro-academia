"use client"

import { useMemo, useState } from "react"
import {
  PROGRAMAS_TREINO,
  NIVEL_META,
  GRUPOS_PROGRAMA,
  countTreinosPrograma,
  type NivelTreinoId,
  type ProgramaNivel,
} from "@/data/programas-treino"
import { cn } from "@/lib/utils"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Clock, Dumbbell, Target, Zap } from "lucide-react"

const NIVEL_ORDER: NivelTreinoId[] = ["iniciante", "intermediario", "avancado"]

function NivelPanel({ programa }: { programa: ProgramaNivel }) {
  const meta = NIVEL_META[programa.id]

  return (
    <div
      className="rounded-xl border border-border/50 overflow-hidden"
      style={{ background: meta.bg }}
    >
      <div className="px-4 py-3 border-b border-border/40 flex flex-wrap items-center gap-2">
        <span className="text-sm font-bold" style={{ color: meta.color }}>
          {programa.emoji} {programa.label}
        </span>
        <span className="text-xs text-muted-foreground">{programa.frequencia}</span>
      </div>

      <div className="p-4 space-y-4">
        <p className="text-sm text-foreground/90 leading-relaxed">
          <span className="font-medium text-muted-foreground">Foco: </span>
          {programa.foco}
        </p>

        {programa.descanso && (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            Descanso: {programa.descanso}
          </p>
        )}

        {programa.objetivos && programa.objetivos.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
              <Target className="w-3.5 h-3.5" /> Objetivo
            </p>
            <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
              {programa.objetivos.map((o) => (
                <li key={o}>{o}</li>
              ))}
            </ul>
          </div>
        )}

        {programa.tecnicas && programa.tecnicas.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1.5">Técnicas</p>
            <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
              {programa.tecnicas.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
        )}

        {programa.beneficios && programa.beneficios.length > 0 && (
          <div className="rounded-lg p-3" style={{ background: "var(--neon-dim)" }}>
            <p className="text-xs font-semibold neon-text mb-1.5 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5" /> Benefícios do Full Body
            </p>
            <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
              {programa.beneficios.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {programa.treinos.map((treino) => (
            <div
              key={treino.id}
              className="metric-card rounded-lg p-4 flex flex-col gap-3"
            >
              <h4
                className="font-semibold text-sm flex items-center gap-2"
                style={{ fontFamily: "var(--font-space-grotesk)", color: meta.color }}
              >
                <Dumbbell className="w-4 h-4 shrink-0" />
                {treino.nome}
              </h4>
              <ol className="space-y-2">
                {treino.exercicios.map((ex, i) => (
                  <li
                    key={`${treino.id}-${i}`}
                    className="flex items-start justify-between gap-2 text-sm"
                  >
                    <span className="text-foreground/90 leading-snug">{ex.nome}</span>
                    <span
                      className="text-xs font-mono font-medium shrink-0 px-2 py-0.5 rounded-md"
                      style={{ background: "var(--secondary)", color: meta.color }}
                    >
                      {ex.series}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function ProgramasTreinoView() {
  const [grupoAtivo, setGrupoAtivo] = useState<string>(GRUPOS_PROGRAMA[0])
  const [nivelAtivo, setNivelAtivo] = useState<NivelTreinoId>("iniciante")

  const programaGrupo = useMemo(
    () => PROGRAMAS_TREINO.find((g) => g.nome === grupoAtivo) ?? PROGRAMAS_TREINO[0],
    [grupoAtivo],
  )

  const nivelPrograma = useMemo(
    () => programaGrupo.niveis.find((n) => n.id === nivelAtivo) ?? programaGrupo.niveis[0],
    [programaGrupo, nivelAtivo],
  )

  const totalTreinos = countTreinosPrograma()

  return (
    <div className="space-y-5">
      <div className="metric-card rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-sm font-semibold" style={{ fontFamily: "var(--font-space-grotesk)" }}>
            Programas por grupo muscular
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {GRUPOS_PROGRAMA.length} grupos · 3 níveis · {totalTreinos} fichas de treino
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {NIVEL_ORDER.map((id) => {
            const m = NIVEL_META[id]
            return (
              <span
                key={id}
                className="text-xs px-2.5 py-1 rounded-full font-medium"
                style={{ color: m.color, background: m.bg }}
              >
                {m.emoji} {m.label}
              </span>
            )
          })}
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {GRUPOS_PROGRAMA.map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => setGrupoAtivo(g)}
            className={cn(
              "shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors border",
              grupoAtivo === g
                ? "border-primary/50 text-primary"
                : "border-border/50 text-muted-foreground hover:text-foreground hover:border-border",
            )}
            style={
              grupoAtivo === g
                ? { background: "var(--neon-dim)" }
                : { background: "var(--secondary)" }
            }
          >
            {g}
          </button>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        {NIVEL_ORDER.map((id) => {
          const m = NIVEL_META[id]
          const hasNivel = programaGrupo.niveis.some((n) => n.id === id)
          return (
            <button
              key={id}
              type="button"
              disabled={!hasNivel}
              onClick={() => setNivelAtivo(id)}
              className={cn(
                "px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border disabled:opacity-40",
                nivelAtivo === id && hasNivel
                  ? "border-transparent shadow-sm"
                  : "border-border/50 text-muted-foreground",
              )}
              style={
                nivelAtivo === id && hasNivel
                  ? { background: m.bg, color: m.color, borderColor: `${m.color}40` }
                  : { background: "var(--secondary)" }
              }
            >
              {m.emoji} {m.label}
            </button>
          )
        })}
      </div>

      {nivelPrograma && <NivelPanel programa={nivelPrograma} />}

      <Accordion type="single" collapsible className="metric-card rounded-xl px-4">
        <AccordionItem value="todos-grupos" className="border-none">
          <AccordionTrigger className="text-sm font-semibold hover:no-underline py-4">
            Ver todos os grupos em lista
          </AccordionTrigger>
          <AccordionContent className="pb-4 space-y-6">
            {PROGRAMAS_TREINO.map((grupo) => (
              <div key={grupo.id}>
                <h3
                  className="text-base font-bold mb-3 sticky top-0 py-2 -mx-1 px-1"
                  style={{
                    fontFamily: "var(--font-space-grotesk)",
                    background: "var(--card)",
                  }}
                >
                  {grupo.nome}
                </h3>
                <div className="space-y-4">
                  {grupo.niveis.map((nivel) => (
                    <NivelPanel key={nivel.id + grupo.id} programa={nivel} />
                  ))}
                </div>
              </div>
            ))}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}
