"use client"

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react"
import { Navbar } from "@/components/layout/navbar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ChevronLeft, ChevronRight, Dumbbell, Activity, Salad, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"]
const horarios = [
  "07:00", "08:00", "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00",
]

type TipoEvento = "treino" | "avaliacao" | "nutricao"

type Evento = {
  id: number
  data: string
  horario: string
  tipo: TipoEvento
  aluno: string
  duracao: number
  observacoes?: string | null
}

type AlunoOption = { id: number; nome: string }

const tipoConfig: Record<TipoEvento, { label: string; color: string; bg: string; icon: typeof Dumbbell }> = {
  treino: { label: "Treino", color: "oklch(0.7 0.22 145)", bg: "oklch(0.7 0.22 145 / 0.15)", icon: Dumbbell },
  avaliacao: { label: "Avaliação", color: "oklch(0.65 0.2 200)", bg: "oklch(0.65 0.2 200 / 0.15)", icon: Activity },
  nutricao: { label: "Nutrição", color: "oklch(0.75 0.18 80)", bg: "oklch(0.75 0.18 80 / 0.15)", icon: Salad },
}

const hoje = new Date()

function toISODate(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function startOfWeek(ref: Date, offsetWeeks: number) {
  const d = new Date(ref)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - d.getDay() + offsetWeeks * 7)
  return d
}

function defaultForm(inicioSemana: Date) {
  const dataPadrao = (() => {
    const h = new Date()
    h.setHours(0, 0, 0, 0)
    const fim = new Date(inicioSemana)
    fim.setDate(inicioSemana.getDate() + 6)
    if (h >= inicioSemana && h <= fim) return toISODate(h)
    return toISODate(inicioSemana)
  })()
  return {
    data: dataPadrao,
    horario: "09:00",
    tipo: "treino" as TipoEvento,
    alunoId: "",
    alunoManual: "",
    duracao: "60",
    observacoes: "",
  }
}

export default function AgendaPage() {
  const [semanaOffset, setSemanaOffset] = useState(0)
  const [eventos, setEventos] = useState<Evento[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [alunos, setAlunos] = useState<AlunoOption[]>([])
  const [novoOpen, setNovoOpen] = useState(false)
  const [form, setForm] = useState(() => defaultForm(startOfWeek(hoje, 0)))
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const inicioSemana = useMemo(() => startOfWeek(hoje, semanaOffset), [semanaOffset])
  const inicioISO = useMemo(() => toISODate(inicioSemana), [inicioSemana])

  const dataAtual = hoje.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  const diasSemanaComData = useMemo(() => {
    return diasSemana.map((label, i) => {
      const data = new Date(inicioSemana)
      data.setDate(inicioSemana.getDate() + i)
      return {
        label,
        numero: data.getDate(),
        iso: toISODate(data),
        isHoje: data.toDateString() === hoje.toDateString(),
      }
    })
  }, [inicioSemana])

  const opcoesDia = useMemo(
    () =>
      diasSemanaComData.map((d) => ({
        value: d.iso,
        label: `${d.label} ${String(d.numero).padStart(2, "0")}/${String(new Date(d.iso).getMonth() + 1).padStart(2, "0")}`,
      })),
    [diasSemanaComData],
  )

  const fetchEventos = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await fetch(`/api/agenda?inicio=${inicioISO}`, { credentials: "include" })
      const data = (await res.json()) as { eventos?: Evento[]; error?: string }
      if (!res.ok) throw new Error(data.error ?? "Não foi possível carregar a agenda.")
      setEventos(data.eventos ?? [])
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Erro ao carregar agenda.")
      setEventos([])
    } finally {
      setLoading(false)
    }
  }, [inicioISO])

  useEffect(() => {
    void fetchEventos()
  }, [fetchEventos])

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/alunos", { credentials: "include" })
        if (!res.ok) return
        const rows = (await res.json()) as { id: number; nome: string }[]
        setAlunos(rows.map((a) => ({ id: a.id, nome: a.nome })))
      } catch {
        /* lista opcional */
      }
    })()
  }, [])

  const resetForm = useCallback(() => {
    const base = defaultForm(inicioSemana)
    setForm({ ...base, alunoId: alunos.length ? "" : "manual" })
    setFormError(null)
  }, [inicioSemana, alunos.length])

  const openNovo = useCallback(() => {
    resetForm()
    setNovoOpen(true)
  }, [resetForm])

  const eventosPorData = (iso: string) => eventos.filter((e) => e.data === iso)

  const stats = useMemo(() => {
    const hojeISO = toISODate(hoje)
    return {
      treinosHoje: eventos.filter((e) => e.data === hojeISO && e.tipo === "treino").length,
      avaliacoesSemana: eventos.filter((e) => e.tipo === "avaliacao").length,
      nutricaoSemana: eventos.filter((e) => e.tipo === "nutricao").length,
    }
  }, [eventos])

  async function handleNovoEvento(e: FormEvent) {
    e.preventDefault()

    const aluno =
      form.alunoId && form.alunoId !== "manual"
        ? alunos.find((a) => String(a.id) === form.alunoId)?.nome ?? ""
        : form.alunoManual.trim()

    if (!aluno) {
      setFormError("Selecione um aluno ou informe o nome.")
      return
    }

    const duracao = Number.parseInt(form.duracao, 10)
    if (!Number.isFinite(duracao) || duracao < 15) {
      setFormError("Duração mínima: 15 minutos.")
      return
    }

    setSaving(true)
    setFormError(null)
    try {
      const res = await fetch("/api/agenda", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: form.data,
          horario: form.horario,
          tipo: form.tipo,
          aluno,
          aluno_id: form.alunoId && form.alunoId !== "manual" ? Number(form.alunoId) : null,
          duracao,
          observacoes: form.observacoes.trim() || null,
        }),
      })
      const data = (await res.json()) as Evento & { error?: string; message?: string }
      if (!res.ok) throw new Error(data.error ?? "Não foi possível criar o evento.")

      setEventos((prev) => [
        ...prev,
        {
          id: data.id,
          data: data.data ?? form.data,
          horario: data.horario ?? form.horario,
          tipo: (data.tipo ?? form.tipo) as TipoEvento,
          aluno: data.aluno ?? aluno,
          duracao: data.duracao ?? duracao,
          observacoes: data.observacoes ?? form.observacoes,
        },
      ])
      toast.success("Evento adicionado à agenda.")
      setNovoOpen(false)
      resetForm()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro ao salvar.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <Navbar
        title="Agenda"
        subtitle={dataAtual}
        action={{ label: "Novo Evento", onClick: openNovo }}
      />

      <div className="p-6 space-y-5">
        {loadError && (
          <p className="text-sm text-destructive" role="alert">
            {loadError}
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Treinos hoje", value: stats.treinosHoje, color: tipoConfig.treino.color },
            { label: "Avaliações esta semana", value: stats.avaliacoesSemana, color: tipoConfig.avaliacao.color },
            { label: "Consultas de nutrição", value: stats.nutricaoSemana, color: tipoConfig.nutricao.color },
          ].map((s) => (
            <div key={s.label} className="metric-card rounded-xl p-4 flex items-center gap-3">
              <span
                className="text-2xl font-bold"
                style={{ color: s.color, fontFamily: "var(--font-space-grotesk)" }}
              >
                {s.value}
              </span>
              <span className="text-sm text-muted-foreground leading-tight">{s.label}</span>
            </div>
          ))}
        </div>

        <div className="metric-card rounded-xl overflow-hidden">
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <h3 className="font-semibold" style={{ fontFamily: "var(--font-space-grotesk)" }}>
              Agenda Semanal
              {loading && <span className="text-xs text-muted-foreground font-normal ml-2">a carregar…</span>}
            </h3>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="w-8 h-8 border-border/50"
                onClick={() => setSemanaOffset((s) => s - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-border/50 text-xs"
                onClick={() => setSemanaOffset(0)}
              >
                Hoje
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="w-8 h-8 border-border/50"
                onClick={() => setSemanaOffset((s) => s + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                size="sm"
                className="gap-1.5 font-semibold hidden sm:inline-flex"
                style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
                onClick={openNovo}
              >
                <Plus className="w-4 h-4" />
                Novo
              </Button>
            </div>
          </div>

          <div
            className="grid grid-cols-8 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <div className="px-3 py-3 text-center">Hora</div>
            {diasSemanaComData.map((d) => (
              <div key={d.iso} className={cn("px-2 py-3 text-center", d.isHoje && "text-primary")}>
                <p>{d.label}</p>
                <p
                  className={cn("text-lg font-bold mt-0.5", d.isHoje ? "neon-text" : "text-foreground")}
                  style={{ fontFamily: "var(--font-space-grotesk)" }}
                >
                  {d.numero}
                </p>
              </div>
            ))}
          </div>

          <div className="overflow-y-auto" style={{ maxHeight: "480px" }}>
            {horarios.map((hora) => (
              <div
                key={hora}
                className="grid grid-cols-8 min-h-[60px]"
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <div className="px-3 py-2 text-xs text-muted-foreground flex items-start pt-3 font-mono">
                  {hora}
                </div>
                {diasSemanaComData.map((dia) => {
                  const evs = eventosPorData(dia.iso).filter((e) => e.horario === hora)
                  return (
                    <div
                      key={dia.iso}
                      className={cn("px-1 py-1 relative", dia.isHoje && "bg-primary/3")}
                      style={{ borderLeft: "1px solid var(--border)" }}
                    >
                      {evs.map((ev) => {
                        const cfg = tipoConfig[ev.tipo]
                        const Icon = cfg.icon
                        return (
                          <div
                            key={ev.id}
                            className="rounded-lg px-2 py-1.5 text-xs mb-1"
                            style={{ background: cfg.bg, borderLeft: `2px solid ${cfg.color}` }}
                            title={ev.observacoes ?? undefined}
                          >
                            <div className="flex items-center gap-1 font-semibold" style={{ color: cfg.color }}>
                              <Icon className="w-3 h-3 shrink-0" />
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

      <Dialog
        open={novoOpen}
        onOpenChange={(open) => {
          setNovoOpen(open)
          if (!open) resetForm()
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={(e) => void handleNovoEvento(e)}>
            <DialogHeader>
              <DialogTitle>Novo evento</DialogTitle>
              <DialogDescription>
                Agende treino, avaliação ou consulta de nutrição na semana visível.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-[min(65vh,28rem)] overflow-y-auto pr-1">
              {formError && (
                <p className="text-sm text-destructive" role="alert">
                  {formError}
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Dia</Label>
                  <Select
                    value={form.data}
                    onValueChange={(v) => setForm((f) => ({ ...f, data: v }))}
                  >
                    <SelectTrigger className="bg-secondary border-border/50 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {opcoesDia.map((d) => (
                        <SelectItem key={d.value} value={d.value}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Horário</Label>
                  <Select
                    value={form.horario}
                    onValueChange={(v) => setForm((f) => ({ ...f, horario: v }))}
                  >
                    <SelectTrigger className="bg-secondary border-border/50 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {horarios.map((h) => (
                        <SelectItem key={h} value={h}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Tipo</Label>
                  <Select
                    value={form.tipo}
                    onValueChange={(v) => setForm((f) => ({ ...f, tipo: v as TipoEvento }))}
                  >
                    <SelectTrigger className="bg-secondary border-border/50 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(tipoConfig) as TipoEvento[]).map((t) => (
                        <SelectItem key={t} value={t}>
                          {tipoConfig[t].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="agenda-duracao">Duração (min)</Label>
                  <Input
                    id="agenda-duracao"
                    type="number"
                    min={15}
                    max={480}
                    step={15}
                    value={form.duracao}
                    onChange={(e) => setForm((f) => ({ ...f, duracao: e.target.value }))}
                    className="bg-secondary border-border/50"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Aluno</Label>
                <Select
                  value={form.alunoId || undefined}
                  onValueChange={(v) => setForm((f) => ({ ...f, alunoId: v, alunoManual: "" }))}
                >
                  <SelectTrigger className="bg-secondary border-border/50 w-full">
                    <SelectValue placeholder="Selecione o aluno" />
                  </SelectTrigger>
                  <SelectContent>
                    {alunos.map((a) => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {a.nome}
                      </SelectItem>
                    ))}
                    <SelectItem value="manual">Outro (digitar nome)</SelectItem>
                  </SelectContent>
                </Select>
                {form.alunoId === "manual" && (
                  <Input
                    placeholder="Nome do aluno"
                    value={form.alunoManual}
                    onChange={(e) => setForm((f) => ({ ...f, alunoManual: e.target.value }))}
                    className="bg-secondary border-border/50"
                  />
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="agenda-obs">Observações (opcional)</Label>
                <Textarea
                  id="agenda-obs"
                  rows={3}
                  placeholder="Ex.: sala 2, trazer exames…"
                  value={form.observacoes}
                  onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
                  className="bg-secondary border-border/50 resize-none"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNovoOpen(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saving}
                style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
              >
                {saving ? "Salvando…" : "Salvar evento"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
