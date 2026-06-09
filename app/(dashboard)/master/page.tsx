"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/layout/navbar"
import { MetricCard } from "@/components/dashboard/metric-card"
import { useSessionUser } from "@/lib/hooks/use-session-user"
import { isMasterEmail } from "@/lib/auth/master"
import type { MasterDashboardMetrics } from "@/lib/master/dashboard-metrics"
import {
  Building2,
  Users,
  UserCircle,
  Crown,
  DollarSign,
  CalendarDays,
  CalendarRange,
  CreditCard,
  Loader2,
} from "lucide-react"

function formatBrl(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function formatDate(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso + "T12:00:00").toLocaleDateString("pt-BR")
}

const tipoLabel = {
  mensalidade: "Mensalidade",
  premium: "Premium",
} as const

export default function MasterDashboardPage() {
  const router = useRouter()
  const { user, loading: sessionLoading } = useSessionUser()
  const [metrics, setMetrics] = useState<MasterDashboardMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadMetrics = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/master/dashboard", { credentials: "include" })
      if (res.status === 403) {
        router.replace("/dashboard")
        return
      }
      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        setError(data.error ?? "Não foi possível carregar o dashboard.")
        return
      }
      setMetrics((await res.json()) as MasterDashboardMetrics)
    } catch {
      setError("Falha de conexão ao carregar métricas.")
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    if (sessionLoading) return
    if (!user || !isMasterEmail(user.email)) {
      router.replace("/dashboard")
      return
    }
    void loadMetrics()
  }, [sessionLoading, user, router, loadMetrics])

  if (sessionLoading || (!user && loading)) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!user || !isMasterEmail(user.email)) {
    return null
  }

  return (
    <div>
      <Navbar title="Dashboard Master" subtitle="Visão geral da plataforma FitPro" />

      <div className="space-y-6 p-6">
        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {loading && !metrics ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : metrics ? (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <MetricCard
                label="Academias cadastradas"
                value={String(metrics.totalAcademias)}
                icon={Building2}
                accent="oklch(0.65 0.2 200)"
              />
              <MetricCard
                label="Total de alunos"
                value={String(metrics.totalAlunos)}
                icon={Users}
                accent="oklch(0.7 0.22 145)"
              />
              <MetricCard
                label="Total de usuários"
                value={String(metrics.totalUsuarios)}
                icon={UserCircle}
                accent="oklch(0.75 0.18 80)"
              />
              <MetricCard
                label="Assinaturas Premium"
                value={String(metrics.totalAssinaturasPremium)}
                icon={Crown}
                accent="oklch(0.65 0.22 280)"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <MetricCard
                label="Receita total"
                value={formatBrl(metrics.receitaTotal)}
                icon={DollarSign}
                accent="oklch(0.7 0.22 145)"
              />
              <MetricCard
                label="Receita mensal"
                value={formatBrl(metrics.receitaMensal)}
                icon={CalendarDays}
                accent="oklch(0.65 0.2 200)"
              />
              <MetricCard
                label="Receita anual"
                value={formatBrl(metrics.receitaAnual)}
                icon={CalendarRange}
                accent="oklch(0.75 0.18 80)"
              />
            </div>

            <div className="metric-card rounded-xl p-5">
              <div className="mb-4 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                <div>
                  <h3
                    className="font-semibold"
                    style={{ fontFamily: "var(--font-space-grotesk)" }}
                  >
                    Últimos pagamentos
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Mensalidades de alunos e assinaturas Premium
                  </p>
                </div>
              </div>

              {metrics.ultimosPagamentos.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum pagamento registrado ainda.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead>
                      <tr className="border-b border-border/50 text-left text-muted-foreground">
                        <th className="pb-3 pr-4 font-medium">Data</th>
                        <th className="pb-3 pr-4 font-medium">Tipo</th>
                        <th className="pb-3 pr-4 font-medium">Descrição</th>
                        <th className="pb-3 pr-4 font-medium">Academia</th>
                        <th className="pb-3 pr-4 font-medium">Método</th>
                        <th className="pb-3 text-right font-medium">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.ultimosPagamentos.map((p) => (
                        <tr
                          key={p.id}
                          className="border-b border-border/30 last:border-0"
                        >
                          <td className="py-3 pr-4 whitespace-nowrap">
                            {formatDate(p.paidAt)}
                          </td>
                          <td className="py-3 pr-4">
                            <span
                              className="rounded-full px-2 py-0.5 text-xs font-medium"
                              style={{
                                background:
                                  p.tipo === "premium"
                                    ? "oklch(0.65 0.22 280 / 0.15)"
                                    : "oklch(0.7 0.22 145 / 0.15)",
                                color:
                                  p.tipo === "premium"
                                    ? "oklch(0.75 0.18 280)"
                                    : "oklch(0.7 0.22 145)",
                              }}
                            >
                              {tipoLabel[p.tipo]}
                            </span>
                          </td>
                          <td className="py-3 pr-4">{p.descricao}</td>
                          <td className="py-3 pr-4 text-muted-foreground">{p.academia}</td>
                          <td className="py-3 pr-4 capitalize text-muted-foreground">
                            {p.metodo ?? "—"}
                          </td>
                          <td className="py-3 text-right font-medium">{formatBrl(p.valor)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
