"use client"

import { useCallback, useEffect, useState } from "react"
import { Navbar } from "@/components/layout/navbar"
import { Progress } from "@/components/ui/progress"
import { TrendingUp, Activity, Scale } from "lucide-react"
import { toast } from "sonner"

type HistoricoItem = { created_at: string; progresso_pct: number; imc: number }
type TreinoResumo = {
  imc: number
  classificacao_imc: string
  progresso_pct: number
  objetivo: string
  split: string
}

export function EvolucaoView() {
  const [loading, setLoading] = useState(true)
  const [historico, setHistorico] = useState<HistoricoItem[]>([])
  const [treino, setTreino] = useState<TreinoResumo | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/treino-inteligente", { credentials: "include" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Erro ao carregar")
      setHistorico(data.historico ?? [])
      if (data.treino) {
        setTreino({
          imc: data.treino.imc,
          classificacao_imc: data.treino.classificacao_imc,
          progresso_pct: data.treino.progresso_pct,
          objetivo: data.treino.objetivo,
          split: data.treino.split,
        })
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar evolução")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <>
      <Navbar title="Evolução" subtitle="Acompanhe seu progresso corporal e de treino" />
      <div className="flex-1 space-y-6 p-4 md:p-6 max-w-3xl mx-auto w-full">
        {loading ? (
          <p className="text-sm text-muted-foreground animate-pulse">Carregando evolução…</p>
        ) : (
          <>
            {treino && (
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-border/50 bg-card p-4">
                  <div className="mb-1 flex items-center gap-2 text-muted-foreground text-xs">
                    <Scale className="h-4 w-4" />
                    IMC
                  </div>
                  <p className="text-lg font-bold">
                    {treino.imc}{" "}
                    <span className="text-sm font-normal text-muted-foreground">
                      ({treino.classificacao_imc})
                    </span>
                  </p>
                </div>
                <div className="rounded-xl border border-border/50 bg-card p-4">
                  <div className="mb-1 flex items-center gap-2 text-muted-foreground text-xs">
                    <Activity className="h-4 w-4" />
                    Objetivo
                  </div>
                  <p className="text-sm font-semibold">{treino.objetivo}</p>
                  <p className="text-xs text-muted-foreground mt-1">{treino.split}</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-card p-4">
                  <div className="mb-2 flex items-center gap-2 text-muted-foreground text-xs">
                    <TrendingUp className="h-4 w-4" />
                    Progresso do ciclo
                  </div>
                  <Progress value={treino.progresso_pct} className="h-2" />
                  <p className="mt-2 text-lg font-bold">{treino.progresso_pct}%</p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                Histórico
              </h2>
              {historico.length === 0 ? (
                <p className="text-sm text-muted-foreground rounded-lg border border-border/50 p-4">
                  Recalcule seu treino em IA Treino para registrar evolução.
                </p>
              ) : (
                historico.map((h, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg border border-border/50 px-4 py-3"
                  >
                    <span className="text-sm">
                      {new Date(h.created_at).toLocaleDateString("pt-BR")}
                    </span>
                    <span className="text-sm text-muted-foreground">IMC {h.imc}</span>
                    <span className="text-sm font-medium text-primary">{h.progresso_pct}%</span>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}
