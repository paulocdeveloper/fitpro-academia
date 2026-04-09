"use client"

import { useState, type FormEvent } from "react"
import { Navbar } from "@/components/layout/navbar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DollarSign, TrendingUp, AlertTriangle, Search, Filter, Plus } from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts"

type PagamentoStatus = "pago" | "pendente" | "atrasado"

type Pagamento = {
  id: number
  aluno: string
  plano: string
  valor: number
  vencimento: string
  pagamento: string | null
  status: PagamentoStatus
}

const pagamentosSeed: Pagamento[] = [
  { id: 1, aluno: "Carlos Silva", plano: "Premium", valor: 189.90, vencimento: "01/01/2025", pagamento: "02/01/2025", status: "pago" },
  { id: 2, aluno: "Ana Lima", plano: "Básico", valor: 89.90, vencimento: "05/01/2025", pagamento: "05/01/2025", status: "pago" },
  { id: 3, aluno: "Pedro Rocha", plano: "Premium", valor: 189.90, vencimento: "10/01/2025", pagamento: null, status: "pendente" },
  { id: 4, aluno: "Maria Costa", plano: "Básico", valor: 89.90, vencimento: "15/12/2024", pagamento: null, status: "atrasado" },
  { id: 5, aluno: "João Oliveira", plano: "VIP", valor: 299.90, vencimento: "20/01/2025", pagamento: "21/01/2025", status: "pago" },
  { id: 6, aluno: "Larissa Melo", plano: "Premium", valor: 189.90, vencimento: "25/01/2025", pagamento: "25/01/2025", status: "pago" },
  { id: 7, aluno: "Fernanda Dias", plano: "VIP", valor: 299.90, vencimento: "01/02/2025", pagamento: null, status: "pendente" },
  { id: 8, aluno: "Rafael Torres", plano: "Básico", valor: 89.90, vencimento: "10/12/2024", pagamento: null, status: "atrasado" },
  { id: 9, aluno: "Camila Nunes", plano: "Premium", valor: 189.90, vencimento: "05/02/2025", pagamento: "06/02/2025", status: "pago" },
  { id: 10, aluno: "Bruno Santos", plano: "VIP", valor: 299.90, vencimento: "15/02/2025", pagamento: null, status: "pendente" },
]

const faturamentoMensal = [
  { mes: "Ago", valor: 29400 },
  { mes: "Set", valor: 33100 },
  { mes: "Out", valor: 35600 },
  { mes: "Nov", valor: 38200 },
  { mes: "Dez", valor: 40100 },
  { mes: "Jan", valor: 42500 },
]

const statusMap = {
  pago: { label: "Pago", class: "status-pago" },
  pendente: { label: "Pendente", class: "status-pendente" },
  atrasado: { label: "Atrasado", class: "status-atrasado" },
}

const planosOpcoes = ["Básico", "Premium", "VIP"] as const
const valorPorPlano: Record<string, number> = {
  Básico: 89.9,
  Premium: 189.9,
  VIP: 299.9,
}

function isoParaBR(iso: string): string {
  const [y, m, d] = iso.split("-")
  if (!y || !m || !d) return iso
  return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`
}

function hojeIso(): string {
  const t = new Date()
  const y = t.getFullYear()
  const m = String(t.getMonth() + 1).padStart(2, "0")
  const d = String(t.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
  if (active && payload?.length) {
    return (
      <div className="glass rounded-lg px-3 py-2 text-sm">
        <p className="text-muted-foreground mb-1">{label}</p>
        <p className="font-semibold neon-text">R$ {payload[0].value.toLocaleString("pt-BR")}</p>
      </div>
    )
  }
  return null
}

const defaultForm = () => ({
  aluno: "",
  plano: "Premium" as (typeof planosOpcoes)[number],
  valor: String(valorPorPlano.Premium),
  vencimento: hojeIso(),
  status: "pendente" as PagamentoStatus,
  pagamento: hojeIso(),
})

export default function FinanceiroPage() {
  const [pagamentos, setPagamentos] = useState<Pagamento[]>(pagamentosSeed)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("todos")
  const [novoOpen, setNovoOpen] = useState(false)
  const [form, setForm] = useState(defaultForm)
  const [formError, setFormError] = useState<string | null>(null)

  const resetForm = () => {
    setForm(defaultForm())
    setFormError(null)
  }

  const openNovoPagamento = () => {
    resetForm()
    setNovoOpen(true)
  }

  const totalPago = pagamentos.filter((p) => p.status === "pago").reduce((s, p) => s + p.valor, 0)
  const totalPendente = pagamentos.filter((p) => p.status === "pendente").reduce((s, p) => s + p.valor, 0)
  const totalAtrasado = pagamentos.filter((p) => p.status === "atrasado").reduce((s, p) => s + p.valor, 0)

  const filtered = pagamentos.filter((p) => {
    const matchSearch = p.aluno.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === "todos" || p.status === statusFilter
    return matchSearch && matchStatus
  })

  const inadimplentes = pagamentos.filter((p) => p.status === "atrasado")

  const handleNovoPagamento = (e: FormEvent) => {
    e.preventDefault()
    const aluno = form.aluno.trim()
    if (!aluno) {
      setFormError("Informe o nome do aluno.")
      return
    }
    const valorNum = Number(String(form.valor).replace(",", "."))
    if (!Number.isFinite(valorNum) || valorNum <= 0) {
      setFormError("Informe um valor válido.")
      return
    }
    if (!form.vencimento) {
      setFormError("Informe a data de vencimento.")
      return
    }
    setFormError(null)

    const vencimento = isoParaBR(form.vencimento)
    const status = form.status
    let pagamento: string | null = null
    if (status === "pago") {
      pagamento = isoParaBR(form.pagamento || hojeIso())
    }

    const nextId = pagamentos.reduce((m, p) => Math.max(m, p.id), 0) + 1

    setPagamentos((prev) => [
      ...prev,
      {
        id: nextId,
        aluno,
        plano: form.plano,
        valor: Math.round(valorNum * 100) / 100,
        vencimento,
        pagamento,
        status,
      },
    ])
    resetForm()
    setNovoOpen(false)
    setStatusFilter("todos")
    setSearch("")
  }

  return (
    <div>
      <Navbar
        title="Financeiro"
        subtitle="Controle de pagamentos e receitas"
        action={{ label: "Novo Pagamento", onClick: openNovoPagamento }}
      />

      <div className="p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: "Recebido no Mês", value: `R$ ${totalPago.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, icon: DollarSign, color: "var(--primary)" },
            { label: "A Receber", value: `R$ ${totalPendente.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, icon: TrendingUp, color: "oklch(0.75 0.18 80)" },
            { label: "Em Atraso", value: `R$ ${totalAtrasado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, icon: AlertTriangle, color: "oklch(0.6 0.2 30)" },
          ].map((m) => (
            <div key={m.label} className="metric-card rounded-xl p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${m.color}20` }}>
                <m.icon className="w-6 h-6" style={{ color: m.color }} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{m.label}</p>
                <p className="text-xl font-bold mt-0.5" style={{ fontFamily: "var(--font-space-grotesk)", color: m.color }}>{m.value}</p>
              </div>
            </div>
          ))}
        </div>

        <Tabs defaultValue="pagamentos">
          <TabsList className="bg-secondary border border-border/50">
            <TabsTrigger value="pagamentos">Pagamentos</TabsTrigger>
            <TabsTrigger value="relatorio">Relatório Mensal</TabsTrigger>
            <TabsTrigger value="inadimplentes">Inadimplentes</TabsTrigger>
          </TabsList>

          <TabsContent value="pagamentos" className="mt-4 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar aluno..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-secondary border-border/50" />
              </div>
              <Button
                type="button"
                className="gap-2 font-semibold shrink-0"
                style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
                onClick={openNovoPagamento}
              >
                <Plus className="w-4 h-4" />
                Novo pagamento
              </Button>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-44 bg-secondary border-border/50">
                  <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pago">Pagos</SelectItem>
                  <SelectItem value="pendente">Pendentes</SelectItem>
                  <SelectItem value="atrasado">Atrasados</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="metric-card rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["Aluno", "Plano", "Valor", "Vencimento", "Pagamento", "Status"].map((h) => (
                      <th key={h} className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3.5">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p, i) => (
                    <tr key={p.id} className="hover:bg-secondary/30 transition-colors" style={{ borderBottom: i < filtered.length - 1 ? "1px solid var(--border)" : "none" }}>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback style={{ background: "var(--neon-dim)", color: "var(--neon)", fontSize: "10px" }}>
                              {p.aluno.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{p.aluno}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground">{p.plano}</td>
                      <td className="px-5 py-3.5 font-semibold">R$ {p.valor.toFixed(2)}</td>
                      <td className="px-5 py-3.5 text-muted-foreground">{p.vencimento}</td>
                      <td className="px-5 py-3.5 text-muted-foreground">{p.pagamento ?? "—"}</td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusMap[p.status].class}`}>
                          {statusMap[p.status].label}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="relatorio" className="mt-4">
            <div className="metric-card rounded-xl p-5">
              <div className="mb-5">
                <h3 className="font-semibold" style={{ fontFamily: "var(--font-space-grotesk)" }}>Faturamento dos Últimos 6 Meses</h3>
                <p className="text-sm text-muted-foreground">Receita total mensal</p>
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={faturamentoMensal} barSize={40}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.01 260)" />
                  <XAxis dataKey="mes" tick={{ fontSize: 12, fill: "oklch(0.55 0.01 260)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: "oklch(0.55 0.01 260)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
                    {faturamentoMensal.map((_, i) => (
                      <Cell key={i} fill={i === faturamentoMensal.length - 1 ? "oklch(0.7 0.22 145)" : "oklch(0.7 0.22 145 / 0.4)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="inadimplentes" className="mt-4 space-y-3">
            {inadimplentes.length === 0 ? (
              <div className="metric-card rounded-xl p-8 text-center">
                <p className="text-muted-foreground">Nenhum aluno inadimplente</p>
              </div>
            ) : (
              inadimplentes.map((p) => (
                <div key={p.id} className="metric-card rounded-xl p-4 flex items-center gap-4">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback style={{ background: "oklch(0.6 0.2 30 / 0.2)", color: "oklch(0.6 0.2 30)", fontSize: "11px" }}>
                      {p.aluno.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">{p.aluno}</p>
                    <p className="text-sm text-muted-foreground">Vencimento: {p.vencimento} · {p.plano}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold" style={{ color: "oklch(0.6 0.2 30)" }}>R$ {p.valor.toFixed(2)}</p>
                    <span className="text-xs font-medium status-atrasado px-2 py-0.5 rounded-full">Atrasado</span>
                  </div>
                  <Button size="sm" variant="outline" className="border-border/50 text-xs">
                    Cobrar
                  </Button>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog
        open={novoOpen}
        onOpenChange={(open) => {
          setNovoOpen(open)
          if (!open) resetForm()
        }}
      >
        <DialogContent
          className="sm:max-w-md"
          onPointerDownOutside={(e) => {
            const t = e.target as HTMLElement
            if (t.closest('[data-slot="select-content"]')) e.preventDefault()
          }}
          onInteractOutside={(e) => {
            const t = e.target as HTMLElement
            if (t.closest('[data-slot="select-content"]')) e.preventDefault()
          }}
        >
          <form onSubmit={handleNovoPagamento}>
            <DialogHeader>
              <DialogTitle>Novo pagamento</DialogTitle>
              <DialogDescription>Lançe um pagamento ou mensalidade na lista. Os totais acima são atualizados automaticamente.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2 max-h-[min(70vh,32rem)] overflow-y-auto pr-1">
              {formError && (
                <p className="text-sm text-destructive" role="alert">
                  {formError}
                </p>
              )}
              <div className="grid gap-2">
                <Label htmlFor="fin-aluno">Aluno</Label>
                <Input
                  id="fin-aluno"
                  placeholder="Nome completo"
                  value={form.aluno}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, aluno: e.target.value }))
                    if (formError) setFormError(null)
                  }}
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Plano</Label>
                  <Select
                    value={form.plano}
                    onValueChange={(v) => {
                      const p = v as (typeof planosOpcoes)[number]
                      setForm((f) => ({
                        ...f,
                        plano: p,
                        valor: String(valorPorPlano[p] ?? f.valor),
                      }))
                    }}
                  >
                    <SelectTrigger className="bg-secondary border-border/50 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {planosOpcoes.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="fin-valor">Valor (R$)</Label>
                  <Input
                    id="fin-valor"
                    type="text"
                    inputMode="decimal"
                    placeholder="189,90"
                    value={form.valor}
                    onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="fin-venc">Vencimento</Label>
                <Input
                  id="fin-venc"
                  type="date"
                  value={form.vencimento}
                  onChange={(e) => setForm((f) => ({ ...f, vencimento: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm((f) => ({ ...f, status: v as PagamentoStatus }))}
                >
                  <SelectTrigger className="bg-secondary border-border/50 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="pago">Pago</SelectItem>
                    <SelectItem value="atrasado">Atrasado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.status === "pago" && (
                <div className="grid gap-2">
                  <Label htmlFor="fin-pago">Data do pagamento</Label>
                  <Input
                    id="fin-pago"
                    type="date"
                    value={form.pagamento}
                    onChange={(e) => setForm((f) => ({ ...f, pagamento: e.target.value }))}
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNovoOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}>
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
