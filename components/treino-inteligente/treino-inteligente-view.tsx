"use client"

import { useCallback, useEffect, useState, type ReactNode } from "react"
import { Navbar } from "@/components/layout/navbar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type {
  DiaTreinoGerado,
  PerfilTreinoInteligente,
  TreinoInteligenteGerado,
} from "@/lib/treino-inteligente/generator"
import { Activity, Brain, RefreshCw, Sparkles, TrendingUp, type LucideIcon } from "lucide-react"
import { toast } from "sonner"

type HistoricoItem = { created_at: string; progresso_pct: number; imc: number }

export function TreinoInteligenteView() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [perfil, setPerfil] = useState<PerfilTreinoInteligente | null>(null)
  const [treino, setTreino] = useState<TreinoInteligenteGerado | null>(null)
  const [historico, setHistorico] = useState<HistoricoItem[]>([])
  const [nome, setNome] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/treino-inteligente", { credentials: "include" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Erro ao carregar")
      setPerfil(data.perfil)
      setTreino(data.treino)
      setHistorico(data.historico ?? [])
      setNome(data.aluno?.nome ?? "")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar treino")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function salvarPerfil() {
    if (!perfil) return
    setSaving(true)
    try {
      const res = await fetch("/api/treino-inteligente", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(perfil),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Erro ao salvar")
      setPerfil(data.perfil)
      setTreino(data.treino)
      toast.success("Treino recalculado!")
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar")
    } finally {
      setSaving(false)
    }
  }

  async function regenerar() {
    setSaving(true)
    try {
      const res = await fetch("/api/treino-inteligente", { method: "POST", credentials: "include" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Erro")
      setTreino(data.treino)
      toast.success("Novo ciclo gerado!")
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro")
    } finally {
      setSaving(false)
    }
  }

  const primeiroNome = nome.split(" ")[0] ?? nome

  if (loading) {
    return (
      <>
        <Navbar title="Treino Inteligente" subtitle="Carregando…" />
        <LoadingState />
      </>
    )
  }

  return (
    <>
      <Navbar
        title="Treino Inteligente"
        subtitle={
          nome
            ? `Olá, ${primeiroNome} — treino personalizado por IA`
            : "Treino personalizado por IA"
        }
        action={{ label: "Recalcular", onClick: regenerar }}
      />

      <div className="flex-1 space-y-6 p-4 md:p-6">
        {treino && <SummaryCards treino={treino} />}

        <Tabs defaultValue="treino" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="treino">Treino</TabsTrigger>
            <TabsTrigger value="perfil">Meu perfil</TabsTrigger>
            <TabsTrigger value="evolucao">Evolução</TabsTrigger>
          </TabsList>

          <TabsContent value="treino" className="mt-4 space-y-4">
            {treino?.dias.map((dia) => (
              <DiaCard key={dia.id} dia={dia} />
            ))}
            {treino?.cardio && <CardioBlock cardio={treino.cardio} />}
          </TabsContent>

          <TabsContent value="perfil" className="mt-4">
            {perfil && (
              <PerfilForm
                perfil={perfil}
                setPerfil={setPerfil}
                onSave={salvarPerfil}
                saving={saving}
              />
            )}
          </TabsContent>

          <TabsContent value="evolucao" className="mt-4 space-y-3">
            {historico.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Histórico aparecerá após recalcular o treino.
              </p>
            ) : (
              historico.map((h, i) => <HistoricoRow key={i} h={h} />)
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}

function LoadingState() {
  return <div className="p-6 text-muted-foreground animate-pulse">Carregando treino…</div>
}

function HistoricoRow({ h }: { h: HistoricoItem }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/50 px-4 py-3">
      <span className="text-sm">{new Date(h.created_at).toLocaleDateString("pt-BR")}</span>
      <span className="text-sm">IMC {h.imc}</span>
      <span className="text-sm font-medium text-primary">{h.progresso_pct}%</span>
    </div>
  )
}

function PerfilForm({
  perfil,
  setPerfil,
  onSave,
  saving,
}: {
  perfil: PerfilTreinoInteligente
  setPerfil: (p: PerfilTreinoInteligente) => void
  onSave: () => void
  saving: boolean
}) {
  return (
    <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
      <Field label="Peso (kg)">
        <Input
          type="number"
          value={perfil.peso_kg}
          onChange={(e) => setPerfil({ ...perfil, peso_kg: Number(e.target.value) })}
        />
      </Field>
      <Field label="Altura (cm)">
        <Input
          type="number"
          value={perfil.altura_cm}
          onChange={(e) => setPerfil({ ...perfil, altura_cm: Number(e.target.value) })}
        />
      </Field>
      <Field label="Idade">
        <Input
          type="number"
          value={perfil.idade}
          onChange={(e) => setPerfil({ ...perfil, idade: Number(e.target.value) })}
        />
      </Field>
      <Field label="Frequência (x/semana)">
        <Input
          type="number"
          min={2}
          max={6}
          value={perfil.frequencia_semanal}
          onChange={(e) => setPerfil({ ...perfil, frequencia_semanal: Number(e.target.value) })}
        />
      </Field>
      <Field label="Objetivo">
        <Input
          value={perfil.objetivo}
          onChange={(e) => setPerfil({ ...perfil, objetivo: e.target.value })}
        />
      </Field>
      <Field label="Nível">
        <Select
          value={perfil.nivel}
          onValueChange={(v) => setPerfil({ ...perfil, nivel: v as PerfilTreinoInteligente["nivel"] })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="iniciante">Iniciante</SelectItem>
            <SelectItem value="intermediario">Intermediário</SelectItem>
            <SelectItem value="avancado">Avançado</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="Sexo">
        <Select
          value={perfil.sexo}
          onValueChange={(v) => setPerfil({ ...perfil, sexo: v as PerfilTreinoInteligente["sexo"] })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="masculino">Masculino</SelectItem>
            <SelectItem value="feminino">Feminino</SelectItem>
            <SelectItem value="outro">Outro</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="% Gordura (opcional)">
        <Input
          type="number"
          value={perfil.percentual_gordura ?? ""}
          onChange={(e) =>
            setPerfil({
              ...perfil,
              percentual_gordura: e.target.value ? Number(e.target.value) : null,
            })
          }
        />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Limitações físicas">
          <Textarea
            value={perfil.limitacoes ?? ""}
            onChange={(e) => setPerfil({ ...perfil, limitacoes: e.target.value })}
            placeholder="Ex.: joelho, lombar…"
          />
        </Field>
      </div>
      <Button onClick={onSave} disabled={saving} className="gap-2 sm:col-span-2">
        {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
        Salvar e recalcular treino
      </Button>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function SummaryCards({ treino }: { treino: TreinoInteligenteGerado }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard icon={Sparkles} label="Split" value={treino.split} />
      <StatCard icon={TrendingUp} label="IMC" value={`${treino.imc} (${treino.classificacao_imc})`} />
      <StatCard icon={Brain} label="Objetivo" value={treino.objetivo} />
      <div className="rounded-xl border border-border/50 bg-card p-4">
        <p className="mb-2 text-xs text-muted-foreground">Progresso do ciclo</p>
        <Progress value={treino.progresso_pct} className="h-2" />
        <p className="mt-2 text-lg font-bold">{treino.progresso_pct}%</p>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-4">
      <StatHeader icon={Icon} label={label} />
      <p className="text-sm font-semibold leading-snug">{value}</p>
    </div>
  )
}

function StatHeader({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="mb-1 flex items-center gap-2 text-muted-foreground">
      <Icon className="h-4 w-4" />
      <span className="text-xs">{label}</span>
    </div>
  )
}

function DiaCard({ dia }: { dia: DiaTreinoGerado }) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-4">
      <h3 className="font-semibold">{dia.nome}</h3>
      <p className="mb-3 text-xs text-muted-foreground">{dia.foco}</p>
      <ul className="space-y-2">
        {dia.exercicios.map((ex) => (
          <li key={ex.nome} className="flex justify-between gap-2 text-sm">
            <span>{ex.nome}</span>
            <span className="shrink-0 text-muted-foreground">{ex.series}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function CardioBlock({ cardio }: { cardio: TreinoInteligenteGerado["cardio"] }) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-4">
      <div className="mb-2 flex items-center gap-2">
        <Activity className="h-4 w-4 text-primary" />
        <h3 className="font-semibold">{cardio.tipo}</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        {cardio.duracao_min} min · {cardio.intensidade}
      </p>
      <p className="mt-1 text-sm">{cardio.notas}</p>
    </div>
  )
}
