"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Navbar } from "@/components/layout/navbar"
import { useAlunosCount } from "@/lib/hooks/use-alunos-count"
import { useIsStaff } from "@/lib/hooks/use-is-staff"
import { defaultHomeForRole } from "@/lib/auth/route-access"
import { isFitnessRole } from "@/lib/auth/roles"
import { MetricCard } from "@/components/dashboard/metric-card"
import { Users, DollarSign, Dumbbell, UserPlus, Activity, CheckCircle2, Clock, AlertCircle } from "lucide-react"
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from "recharts"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

const revenueData = [
  { mes: "Jan", valor: 18400 },
  { mes: "Fev", valor: 21200 },
  { mes: "Mar", valor: 19800 },
  { mes: "Abr", valor: 24600 },
  { mes: "Mai", valor: 22100 },
  { mes: "Jun", valor: 27800 },
  { mes: "Jul", valor: 31200 },
  { mes: "Ago", valor: 29400 },
  { mes: "Set", valor: 33100 },
  { mes: "Out", valor: 35600 },
  { mes: "Nov", valor: 38200 },
  { mes: "Dez", valor: 42500 },
]

const alunosData = [
  { dia: "Seg", alunos: 68 },
  { dia: "Ter", alunos: 82 },
  { dia: "Qua", alunos: 91 },
  { dia: "Qui", alunos: 74 },
  { dia: "Sex", alunos: 103 },
  { dia: "Sab", alunos: 120 },
  { dia: "Dom", alunos: 45 },
]

const treinosHoje = [
  { aluno: "Carlos Silva", horario: "07:00", tipo: "Musculação", status: "concluido" },
  { aluno: "Ana Lima", horario: "08:30", tipo: "Funcional", status: "concluido" },
  { aluno: "Pedro Rocha", horario: "10:00", tipo: "Musculação", status: "em_andamento" },
  { aluno: "Maria Costa", horario: "11:30", tipo: "Pilates", status: "agendado" },
  { aluno: "João Oliveira", horario: "14:00", tipo: "CrossFit", status: "agendado" },
  { aluno: "Larissa Melo", horario: "16:00", tipo: "Yoga", status: "agendado" },
]

const novosAlunos = [
  { nome: "Fernanda Dias", objetivo: "Emagrecimento", data: "hoje" },
  { nome: "Rafael Torres", objetivo: "Hipertrofia", data: "hoje" },
  { nome: "Camila Nunes", objetivo: "Condicionamento", data: "ontem" },
  { nome: "Bruno Santos", objetivo: "Força", data: "ontem" },
]

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  concluido: { label: "Concluído", color: "#4ade80", icon: CheckCircle2 },
  em_andamento: { label: "Em andamento", color: "#facc15", icon: Activity },
  agendado: { label: "Agendado", color: "#94a3b8", icon: Clock },
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass rounded-lg px-3 py-2 text-sm">
        <p className="text-muted-foreground mb-1">{label}</p>
        <p className="font-semibold neon-text">
          {payload[0].name === "valor"
            ? `R$ ${payload[0].value.toLocaleString("pt-BR")}`
            : `${payload[0].value} alunos`}
        </p>
      </div>
    )
  }
  return null
}

export default function DashboardPage() {
  const pathname = usePathname()
  const router = useRouter()
  const alunosCount = useAlunosCount(pathname)
  const { user, loading, isStaff } = useIsStaff()

  useEffect(() => {
    if (!loading && user && isFitnessRole(user.role)) {
      router.replace(defaultHomeForRole(user.role))
    }
  }, [loading, user, router])

  if (!loading && user && isFitnessRole(user.role)) {
    return null
  }

  const welcome = user ? `Bem-vindo de volta, ${user.displayName}` : "Bem-vindo de volta"

  return (
    <div>
      <Navbar title="Dashboard" subtitle={welcome} />

      <div className="p-6 space-y-6">
        {/* Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Alunos cadastrados"
            value={alunosCount === null ? "…" : String(alunosCount)}
            icon={Users}
          />
          <MetricCard label="Faturamento Mensal" value="R$ 42.500" change="+8.3%" positive icon={DollarSign} accent="oklch(0.65 0.2 200)" />
          <MetricCard label="Treinos Hoje" value="38" change="+5%" positive icon={Dumbbell} accent="oklch(0.75 0.18 80)" />
          <MetricCard label="Novos Alunos" value="12" change="+20%" positive icon={UserPlus} accent="oklch(0.65 0.22 280)" />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Revenue Chart */}
          <div className="lg:col-span-2 metric-card rounded-xl p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-semibold" style={{ fontFamily: "var(--font-space-grotesk)" }}>Faturamento Anual</h3>
                <p className="text-sm text-muted-foreground">Evolução mensal de receita</p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: "var(--neon-dim)", color: "var(--neon)" }}>
                2025
              </span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.7 0.22 145)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="oklch(0.7 0.22 145)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.01 260)" />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "oklch(0.55 0.01 260)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "oklch(0.55 0.01 260)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="valor" stroke="oklch(0.7 0.22 145)" strokeWidth={2} fill="url(#colorValor)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Weekly attendance */}
          <div className="metric-card rounded-xl p-5">
            <div className="mb-5">
              <h3 className="font-semibold" style={{ fontFamily: "var(--font-space-grotesk)" }}>Frequência Semanal</h3>
              <p className="text-sm text-muted-foreground">Alunos por dia</p>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={alunosData} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.01 260)" />
                <XAxis dataKey="dia" tick={{ fontSize: 11, fill: "oklch(0.55 0.01 260)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "oklch(0.55 0.01 260)" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="alunos" radius={[4, 4, 0, 0]}>
                  {alunosData.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={entry.dia === "Sab" ? "oklch(0.7 0.22 145)" : "oklch(0.7 0.22 145 / 0.35)"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Treinos & Novos Alunos */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Treinos do dia */}
          <div className="lg:col-span-2 metric-card rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold" style={{ fontFamily: "var(--font-space-grotesk)" }}>Treinos de Hoje</h3>
                <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</p>
              </div>
              <span className="text-xs text-muted-foreground">{treinosHoje.length} agendados</span>
            </div>
            <div className="space-y-2">
              {treinosHoje.map((treino, i) => {
                const cfg = statusConfig[treino.status]
                const Icon = cfg.icon
                return (
                  <div key={i} className="flex items-center gap-4 px-4 py-3 rounded-lg transition-colors hover:bg-secondary/50" style={{ background: "var(--surface-elevated)" }}>
                    <span className="text-sm font-mono text-muted-foreground w-12 flex-shrink-0">{treino.horario}</span>
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarFallback style={{ background: "var(--primary)", color: "var(--primary-foreground)", fontSize: "10px" }}>
                        {treino.aluno.split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{treino.aluno}</p>
                      <p className="text-xs text-muted-foreground">{treino.tipo}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Icon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
                      <span className="text-xs font-medium" style={{ color: cfg.color }}>{cfg.label}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Novos Alunos */}
          <div className="metric-card rounded-xl p-5">
            <div className="mb-4">
              <h3 className="font-semibold" style={{ fontFamily: "var(--font-space-grotesk)" }}>Novos Alunos</h3>
              <p className="text-sm text-muted-foreground">Recém cadastrados</p>
            </div>
            <div className="space-y-3">
              {novosAlunos.map((aluno, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Avatar className="w-9 h-9 flex-shrink-0">
                    <AvatarFallback style={{ background: `oklch(${0.55 + i * 0.05} 0.18 ${145 + i * 40})`, color: "white", fontSize: "11px" }}>
                      {aluno.nome.split(" ").map(n => n[0]).join("").slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{aluno.nome}</p>
                    <p className="text-xs text-muted-foreground truncate">{aluno.objetivo}</p>
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0">{aluno.data}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-border/50">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Taxa de retenção</span>
                <span className="font-semibold neon-text">94.2%</span>
              </div>
              <div className="mt-2 h-1.5 rounded-full" style={{ background: "var(--secondary)" }}>
                <div className="h-full rounded-full neon-glow" style={{ width: "94.2%", background: "var(--primary)" }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
