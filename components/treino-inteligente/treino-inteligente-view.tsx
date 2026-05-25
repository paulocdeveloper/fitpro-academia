"use client"

import { useCallback, useEffect, useState } from "react"
import { Navbar } from "@/components/layout/navbar"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PerfilTreinoForm } from "@/components/treino-inteligente/perfil-treino-form"
import { salvarPerfilTreinoApi } from "@/lib/treino-inteligente/salvar-perfil-client"
import { friendlyFetchError, normalizePerfil } from "@/lib/treino-inteligente/perfil-schema"
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
  const [formKey, setFormKey] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/treino-inteligente", { credentials: "include" })
      let data: {
        error?: string
        perfil?: PerfilTreinoInteligente
        treino?: TreinoInteligenteGerado
        historico?: HistoricoItem[]
        aluno?: { nome?: string }
      }
      try {
        data = await res.json()
      } catch {
        throw new Error(res.ok ? "Resposta inválida do servidor." : `Erro ${res.status}`)
      }
      if (!res.ok) throw new Error(data.error ?? "Erro ao carregar")
      setPerfil(normalizePerfil(data.perfil))
      setTreino(data.treino ?? null)
      setHistorico(data.historico ?? [])
      setNome(data.aluno?.nome ?? "")
      setFormKey((k) => k + 1)
    } catch (e) {
      toast.error(friendlyFetchError(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function salvarPerfil(draft: PerfilTreinoInteligente) {
    setSaving(true)
    try {
      const result = await salvarPerfilTreinoApi(draft)
      setPerfil(result.perfil)
      setTreino((result.treino as TreinoInteligenteGerado | undefined) ?? null)
      setFormKey((k) => k + 1)
      toast.success("Treino recalculado!")
      load()
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
              <PerfilTreinoForm
                key={formKey}
                className="max-w-2xl"
                perfil={perfil}
                onChange={setPerfil}
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
