"use client"

import { useState, type FormEvent } from "react"
import { Navbar } from "@/components/layout/navbar"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
import { Search, PlayCircle, Dumbbell, Plus } from "lucide-react"

type Exercicio = {
  id: string
  nome: string
  grupo: string
  equipamento: string
  nivel: string
  video: boolean
  descricao: string
}

const exerciciosSeed: Omit<Exercicio, "id">[] = [
  { nome: "Supino Reto com Barra", grupo: "Peito", equipamento: "Barra", nivel: "Intermediário", video: true, descricao: "Deite no banco, segure a barra com pegada afastada e execute o movimento controlado." },
  { nome: "Agachamento Livre", grupo: "Pernas", equipamento: "Barra", nivel: "Avançado", video: true, descricao: "Posicione a barra nos ombros, mantenha o core ativo e desça até o paralelo." },
  { nome: "Puxada Frente", grupo: "Costas", equipamento: "Polia", nivel: "Iniciante", video: true, descricao: "Segure a barra larga, puxe até a altura do queixo com os cotovelos apontando para baixo." },
  { nome: "Desenvolvimento com Halteres", grupo: "Ombros", equipamento: "Halteres", nivel: "Intermediário", video: false, descricao: "Sentado, empurre os halteres acima da cabeça em arco natural." },
  { nome: "Rosca Direta", grupo: "Bíceps", equipamento: "Barra", nivel: "Iniciante", video: true, descricao: "Em pé, com barra na pegada supinada, execute a flexão do cotovelo." },
  { nome: "Tríceps Pulley", grupo: "Tríceps", equipamento: "Polia", nivel: "Iniciante", video: true, descricao: "Segure a polia alta, cotovelos fixos, extensão completa." },
  { nome: "Levantamento Terra", grupo: "Posterior", equipamento: "Barra", nivel: "Avançado", video: true, descricao: "Quadril para trás, coluna neutra, levante a barra do chão com força nos glúteos." },
  { nome: "Remada Curvada", grupo: "Costas", equipamento: "Barra", nivel: "Intermediário", video: false, descricao: "Curvado a 45°, puxe a barra até o abdômen com cotovelos abertos." },
  { nome: "Burpee", grupo: "Full Body", equipamento: "Nenhum", nivel: "Avançado", video: true, descricao: "Agacha, apoia as mãos, joga os pés, faz a flexão, salta com os braços acima." },
  { nome: "Prancha", grupo: "Core", equipamento: "Nenhum", nivel: "Iniciante", video: false, descricao: "Apoio nos antebraços e dedos dos pés, corpo em linha reta." },
  { nome: "Leg Press 45°", grupo: "Pernas", equipamento: "Máquina", nivel: "Iniciante", video: true, descricao: "Pés na plataforma, empurre de forma controlada sem travar os joelhos." },
  { nome: "Elevação Lateral", grupo: "Ombros", equipamento: "Halteres", nivel: "Iniciante", video: false, descricao: "Em pé, eleve os halteres lateralmente até a altura dos ombros." },
]

const exerciciosInicial: Exercicio[] = exerciciosSeed.map((e, i) => ({
  ...e,
  id: `ex-${i + 1}`,
}))

const grupos = ["Todos", "Peito", "Costas", "Pernas", "Ombros", "Bíceps", "Tríceps", "Posterior", "Full Body", "Core"]
const gruposMuscular = grupos.filter((g) => g !== "Todos")
const equipamentos = ["Barra", "Polia", "Halteres", "Máquina", "Nenhum"]
const niveis = ["Todos", "Iniciante", "Intermediário", "Avançado"]
const niveisExercicio = niveis.filter((n) => n !== "Todos")

const nivelColors: Record<string, string> = {
  Iniciante: "oklch(0.7 0.22 145)",
  Intermediário: "oklch(0.75 0.18 80)",
  Avançado: "oklch(0.6 0.2 30)",
}

const defaultNovoExercicio = () => ({
  nome: "",
  descricao: "",
  grupo: gruposMuscular[0] ?? "Peito",
  equipamento: equipamentos[0] ?? "Barra",
  nivel: niveisExercicio[0] ?? "Iniciante",
  video: false,
})

export default function ExerciciosPage() {
  const [exercicios, setExercicios] = useState<Exercicio[]>(exerciciosInicial)
  const [search, setSearch] = useState("")
  const [grupo, setGrupo] = useState("Todos")
  const [nivel, setNivel] = useState("Todos")
  const [novoOpen, setNovoOpen] = useState(false)
  const [form, setForm] = useState(defaultNovoExercicio)
  const [formError, setFormError] = useState<string | null>(null)

  const resetForm = () => {
    setForm(defaultNovoExercicio())
    setFormError(null)
  }

  function newExerciseId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return `ex-${crypto.randomUUID()}`
    }
    return `ex-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  }

  const filtered = exercicios.filter((e) => {
    const matchSearch = e.nome.toLowerCase().includes(search.toLowerCase())
    const matchGrupo = grupo === "Todos" || e.grupo === grupo
    const matchNivel = nivel === "Todos" || e.nivel === nivel
    return matchSearch && matchGrupo && matchNivel
  })

  const handleNovoExercicio = (e: FormEvent) => {
    e.preventDefault()
    const nome = form.nome.trim()
    if (!nome) {
      setFormError("Informe o nome do exercício.")
      return
    }
    setFormError(null)

    setExercicios((prev) => [
      ...prev,
      {
        id: newExerciseId(),
        nome,
        descricao: form.descricao.trim() || "Sem descrição cadastrada.",
        grupo: form.grupo,
        equipamento: form.equipamento,
        nivel: form.nivel,
        video: form.video,
      },
    ])
    setSearch("")
    setGrupo("Todos")
    setNivel("Todos")
    resetForm()
    setNovoOpen(false)
  }

  return (
    <div>
      <Navbar
        title="Biblioteca de Exercícios"
        subtitle="Catálogo completo de exercícios"
        action={{
          label: "Novo Exercício",
          onClick: () => {
            resetForm()
            setNovoOpen(true)
          },
        }}
      />

      <div className="p-6 space-y-5">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar exercício..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-secondary border-border/50" />
          </div>
          <Button
            type="button"
            className="gap-2 font-semibold shrink-0 w-full sm:w-auto"
            style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
            onClick={() => {
              resetForm()
              setNovoOpen(true)
            }}
          >
            <Plus className="w-4 h-4" />
            Novo exercício
          </Button>
          <Select value={grupo} onValueChange={setGrupo}>
            <SelectTrigger className="w-full sm:w-44 bg-secondary border-border/50">
              <SelectValue placeholder="Grupo muscular" />
            </SelectTrigger>
            <SelectContent>
              {grupos.map((g) => (
                <SelectItem key={g} value={g}>
                  {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={nivel} onValueChange={setNivel}>
            <SelectTrigger className="w-full sm:w-44 bg-secondary border-border/50">
              <SelectValue placeholder="Nível" />
            </SelectTrigger>
            <SelectContent>
              {niveis.map((n) => (
                <SelectItem key={n} value={n}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((ex) => (
            <div key={ex.id} className="metric-card rounded-xl p-5 flex flex-col gap-4 group cursor-pointer">
              <div className="flex items-start justify-between">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "var(--neon-dim)" }}>
                  <Dumbbell className="w-5 h-5 neon-text" />
                </div>
                {ex.video && (
                  <div className="flex items-center gap-1.5 text-xs neon-text">
                    <PlayCircle className="w-4 h-4" />
                    Vídeo
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-semibold group-hover:text-primary transition-colors">{ex.nome}</h3>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed line-clamp-2">{ex.descricao}</p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: "var(--secondary)", color: "var(--muted-foreground)" }}>
                  {ex.grupo}
                </span>
                <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: "var(--secondary)", color: "var(--muted-foreground)" }}>
                  {ex.equipamento}
                </span>
                <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ color: nivelColors[ex.nivel], background: `${nivelColors[ex.nivel]}20` }}>
                  {ex.nivel}
                </span>
              </div>
            </div>
          ))}
        </div>

        <p className="text-sm text-muted-foreground text-center">{filtered.length} exercícios encontrados</p>
      </div>

      <Dialog
        open={novoOpen}
        onOpenChange={(open) => {
          setNovoOpen(open)
          if (!open) resetForm()
        }}
      >
        <DialogContent
          className="sm:max-w-lg"
          onPointerDownOutside={(e) => {
            const t = e.target as HTMLElement
            if (t.closest('[data-slot="select-content"]')) e.preventDefault()
          }}
          onInteractOutside={(e) => {
            const t = e.target as HTMLElement
            if (t.closest('[data-slot="select-content"]')) e.preventDefault()
          }}
        >
          <form onSubmit={handleNovoExercicio}>
            <DialogHeader>
              <DialogTitle>Novo exercício</DialogTitle>
              <DialogDescription>Preencha os dados para incluir no catálogo. Ele aparecerá na grade e nos filtros.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2 max-h-[min(60vh,28rem)] overflow-y-auto pr-1">
              {formError && (
                <p className="text-sm text-destructive" role="alert">
                  {formError}
                </p>
              )}
              <div className="grid gap-2">
                <Label htmlFor="ex-nome">Nome</Label>
                <Input
                  id="ex-nome"
                  placeholder="Ex.: Supino inclinado com halteres"
                  value={form.nome}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, nome: e.target.value }))
                    if (formError) setFormError(null)
                  }}
                  autoFocus
                  aria-invalid={!!formError}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ex-desc">Descrição / execução</Label>
                <Textarea
                  id="ex-desc"
                  placeholder="Como executar o movimento com segurança…"
                  value={form.descricao}
                  onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                  className="min-h-24"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Grupo muscular</Label>
                  <Select value={form.grupo} onValueChange={(v) => setForm((f) => ({ ...f, grupo: v }))}>
                    <SelectTrigger className="bg-secondary border-border/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {gruposMuscular.map((g) => (
                        <SelectItem key={g} value={g}>
                          {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Equipamento</Label>
                  <Select value={form.equipamento} onValueChange={(v) => setForm((f) => ({ ...f, equipamento: v }))}>
                    <SelectTrigger className="bg-secondary border-border/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {equipamentos.map((eq) => (
                        <SelectItem key={eq} value={eq}>
                          {eq}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Nível</Label>
                <Select value={form.nivel} onValueChange={(v) => setForm((f) => ({ ...f, nivel: v }))}>
                  <SelectTrigger className="bg-secondary border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {niveisExercicio.map((n) => (
                      <SelectItem key={n} value={n}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="ex-video" checked={form.video} onCheckedChange={(c) => setForm((f) => ({ ...f, video: c === true }))} />
                <Label htmlFor="ex-video" className="font-normal cursor-pointer">
                  Possui vídeo demonstrativo
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNovoOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}>
                Salvar exercício
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
