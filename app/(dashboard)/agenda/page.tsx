"use client"

import { useState } from "react"
import { Navbar } from "@/components/layout/navbar"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Dumbbell, Activity, Salad, Clock, Users } from "lucide-react"
import { cn } from "@/lib/utils"

const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"]
const horarios = ["07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"]

type TipoEvento = "treino" | "avaliacao" | "nutricao"

interface Evento {
  id: number
  dia: number
  horario: string
  tipo: TipoEvento
  aluno: string
  duracao: number
}

const eventos: Evento[] = [
  { id: 1, dia: 1, horario: "07:00", tipo: "treino", aluno: "Carlos Silva", duracao: 60 },
  { id: 2, dia: 1, horario: "08:00", tipo: "treino", aluno: "Ana Lima", duracao: 60 },
  { id: 3, dia: 1, horario: "10:00", tipo: "avaliacao", aluno: "Pedro Rocha", duracao: 45 },
  { id: 4, dia: 2, horario: "07:00", tipo: "treino", aluno: "Maria Costa", duracao: 60 },
  { id: 5, dia: 2, horario: "09:00", tipo: "nutricao", aluno: "João Oliveira", duracao: 30 },
  { id: 6, dia: 3, horario: "07:00", tipo: "treino", aluno: "Carlos Silva", duracao: 60 },
  { id: 7, dia: 3, horario: "11:00", tipo: "treino", aluno: "Larissa Melo", duracao: 60 },
  { id: 8, dia: 4, horario: "08:00", tipo: "avaliacao", aluno: "Ana Lima", duracao: 45 },
  { id: 9, dia: 4, horario: "16:00", tipo: "treino", aluno: "Rafael Torres", duracao: 60 },
  { id: 10, dia: 5, horario: "07:00", tipo: "treino", aluno: "Carlos Silva", duracao: 60 },
  { id: 11, dia: 5, horario: "10:00", tipo: "nutricao", aluno: "Camila Nunes", duracao: 30 },
  { id: 12, dia: 6, horario: "09:00", tipo: "treino", aluno: "Bruno Santos", duracao: 60 },
  { id: 13, dia: 6, horario: "11:00", tipo: "treino", aluno: "Fernanda Dias", duracao: 60 },
]

const tipoConfig: Record<TipoEvento, { label: string; color: string; bg: string; icon: typeof Dumbbell }> = {
  treino: { label: "Treino", color: "oklch(0.7 0.22 145)", bg: "oklch(0.7 0.22 145 / 0.15)", icon: Dumbbell },
  avaliacao: { label: "Avaliação", color: "oklch(0.65 0.2 200)", bg: "oklch(0.65 0.2 200 / 0.15)", icon: Activity },
  nutricao: { label: "Nutrição", color: "oklch(0.75 0.18 80)", bg: "oklch(0.75 0.18 80 / 0.15)", icon: Salad },
}

const hoje = new Date()
const dataAtual = `${hoje.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })}`

export default function AgendaPage() {
  const [semanaOffset, setSemanaOffset] = useState(0)

  const inicioSemana = new Date(hoje)
  inicioSemana.setDate(hoje.getDate() - hoje.getDay() + semanaOffset * 7)

  const diasSemanaComData = diasSemana.map((d, i) => {
    const data = new Date(inicioSemana)
    data.setDate(inicioSemana.getDate() + i)
    return { label: d, numero: data.getDate(), isHoje: data.toDateString() === hoje.toDateString() }
  })

  const eventosPorDia = (diaIdx: number) =>
    eventos.filter(e => e.dia === diaIdx)

  return (
    <div>
      <Navbar title="Agenda" subtitle={dataAtual} action={{ label: "Novo Evento" }} />

      <div className="p-6 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Treinos hoje", value: eventos.filter(e => e.dia === hoje.getDay() && e.tipo === "treino").length, color: tipoConfig.treino.color },
            { label: "Avaliações esta semana", value: eventos.filter(e => e.tipo === "avaliacao").length, color: tipoConfig.avaliacao.color },
            { label: "Consultas de nutrição", value: eventos.filter(e => e.tipo === "nutricao").length, color: tipoConfig.nutricao.color },
          ].map(s => (
            <div key={s.label} className="metric-card rounded-xl p-4 flex items-center gap-3">
              <span className="text-2xl font-bold" style={{ color: s.color, fontFamily: "var(--font-space-grotesk)" }}>{s.value}</span>
              <span className="text-sm text-muted-foreground leading-tight">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Calendário */}
        <div className="metric-card rounded-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
            <h3 className="font-semibold" style={{ fontFamily: "var(--font-space-grotesk)" }}>Agenda Semanal</h3>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="w-8 h-8 border-border/50" onClick={() => setSemanaOffset(s => s - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" className="border-border/50 text-xs" onClick={() => setSemanaOffset(0)}>
                Hoje
              </Button>
              <Button variant="outline" size="icon" className="w-8 h-8 border-border/50" onClick={() => setSemanaOffset(s => s + 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Grid header */}
          <div className="grid grid-cols-8 text-xs font-semibold text-muted-foreground uppercase tracking-wider" style={{ borderBottom: "1px solid var(--border)" }}>
            <div className="px-3 py-3 text-center">Hora</div>
            {diasSemanaComData.map((d) => (
              <div key={d.label} className={cn("px-2 py-3 text-center", d.isHoje && "text-primary")}>
                <p>{d.label}</p>
                <p className={cn("text-lg font-bold mt-0.5", d.isHoje ? "neon-text" : "text-foreground")} style={{ fontFamily: "var(--font-space-grotesk)" }}>
                  {d.numero}
                </p>
              </div>
            ))}
          </div>

          {/* Time slots */}
          <div className="overflow-y-auto" style={{ maxHeight: "480px" }}>
            {horarios.map((hora) => (
              <div key={hora} className="grid grid-cols-8 min-h-[60px]" style={{ borderBottom: "1px solid var(--border)" }}>
                <div className="px-3 py-2 text-xs text-muted-foreground flex items-start pt-3 font-mono">
                  {hora}
                </div>
                {[0, 1, 2, 3, 4, 5, 6].map(diaIdx => {
                  const evs = eventosPorDia(diaIdx).filter(e => e.horario === hora)
                  const isDiaHoje = diasSemanaComData[diaIdx]?.isHoje
                  return (
                    <div
                      key={diaIdx}
                      className={cn(
                        "px-1 py-1 relative",
                        isDiaHoje && "bg-primary/3"
                      )}
                      style={{ borderLeft: "1px solid var(--border)" }}
                    >
                      {evs.map(ev => {
                        const cfg = tipoConfig[ev.tipo]
                        const Icon = cfg.icon
                        return (
                          <div
                            key={ev.id}
                            className="rounded-lg px-2 py-1.5 text-xs cursor-pointer hover:opacity-80 transition-opacity"
                            style={{ background: cfg.bg, borderLeft: `2px solid ${cfg.color}` }}
                          >
                            <div className="flex items-center gap-1 font-semibold" style={{ color: cfg.color }}>
                              <Icon className="w-3 h-3" />
                              <span className="truncate">{cfg.label}</span>
                            </div>
                            <p className="text-muted-foreground truncate mt-0.5">{ev.aluno}</p>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Legenda */}
        <div className="flex items-center gap-4 flex-wrap">
          {Object.entries(tipoConfig).map(([key, cfg]) => {
            const Icon = cfg.icon
            return (
              <div key={key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Icon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
                <span>{cfg.label}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
