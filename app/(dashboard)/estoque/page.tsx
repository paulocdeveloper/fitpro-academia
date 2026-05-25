"use client"

import { useState } from "react"
import { Navbar } from "@/components/layout/navbar"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Package, TrendingUp, TrendingDown, AlertTriangle, ShoppingCart, Plus } from "lucide-react"

const produtos = [
  { id: 1, nome: "Whey Protein 1kg", categoria: "Suplemento", qtd: 42, preco: 89.90, fornecedor: "NutriMax", minimo: 10, status: "ok" },
  { id: 2, nome: "Creatina 300g", categoria: "Suplemento", qtd: 28, preco: 49.90, fornecedor: "NutriMax", minimo: 10, status: "ok" },
  { id: 3, nome: "Camiseta FitPro M", categoria: "Vestuário", qtd: 6, preco: 59.90, fornecedor: "FitWear", minimo: 10, status: "baixo" },
  { id: 4, nome: "Camiseta FitPro G", categoria: "Vestuário", qtd: 12, preco: 59.90, fornecedor: "FitWear", minimo: 10, status: "ok" },
  { id: 5, nome: "Luvas de Treino", categoria: "Acessório", qtd: 3, preco: 45.90, fornecedor: "SportPro", minimo: 8, status: "critico" },
  { id: 6, nome: "Shaker 700ml", categoria: "Acessório", qtd: 18, preco: 29.90, fornecedor: "FitWear", minimo: 10, status: "ok" },
  { id: 7, nome: "BCAA 200g", categoria: "Suplemento", qtd: 0, preco: 39.90, fornecedor: "NutriMax", minimo: 10, status: "zerado" },
  { id: 8, nome: "Garrafa Térmica 1L", categoria: "Acessório", qtd: 9, preco: 79.90, fornecedor: "SportPro", minimo: 8, status: "ok" },
]

const movimentacoes = [
  { tipo: "venda", produto: "Whey Protein 1kg", qtd: 2, data: "Hoje 14:30", valor: 179.80 },
  { tipo: "compra", produto: "Luvas de Treino", qtd: 20, data: "Hoje 10:00", valor: 458.00 },
  { tipo: "venda", produto: "Shaker 700ml", qtd: 1, data: "Ontem 16:45", valor: 29.90 },
  { tipo: "compra", produto: "Creatina 300g", qtd: 30, data: "Ontem 09:00", valor: 897.00 },
  { tipo: "venda", produto: "Camiseta FitPro M", qtd: 1, data: "Seg 11:20", valor: 59.90 },
]

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  ok: { label: "Normal", color: "oklch(0.7 0.22 145)", bg: "oklch(0.7 0.22 145 / 0.15)" },
  baixo: { label: "Baixo", color: "oklch(0.75 0.18 80)", bg: "oklch(0.75 0.18 80 / 0.15)" },
  critico: { label: "Crítico", color: "oklch(0.6 0.2 30)", bg: "oklch(0.6 0.2 30 / 0.15)" },
  zerado: { label: "Zerado", color: "oklch(0.55 0.22 25)", bg: "oklch(0.55 0.22 25 / 0.15)" },
}

export default function EstoquePage() {
  const [search, setSearch] = useState("")

  const filtered = produtos.filter(p => p.nome.toLowerCase().includes(search.toLowerCase()))
  const alertas = produtos.filter(p => p.status !== "ok")
  const valorTotal = produtos.reduce((s, p) => s + p.qtd * p.preco, 0)

  return (
    <div>
      <Navbar title="Estoque" subtitle="Controle de produtos e movimentações" action={{ label: "Novo Produto" }} />

      <div className="p-6 space-y-5">
        {/* Métricas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total de SKUs", value: produtos.length, icon: Package, color: "var(--primary)" },
            { label: "Valor em Estoque", value: `R$ ${valorTotal.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`, icon: TrendingUp, color: "oklch(0.65 0.2 200)" },
            { label: "Itens com Alerta", value: alertas.length, icon: AlertTriangle, color: "oklch(0.6 0.2 30)" },
            { label: "Movimentos Hoje", value: movimentacoes.filter(m => m.data.startsWith("Hoje")).length, icon: ShoppingCart, color: "oklch(0.75 0.18 80)" },
          ].map(m => (
            <div key={m.label} className="metric-card rounded-xl p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${m.color}20` }}>
                <m.icon className="w-4 h-4" style={{ color: m.color }} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{m.label}</p>
                <p className="font-bold text-lg" style={{ fontFamily: "var(--font-space-grotesk)" }}>{m.value}</p>
              </div>
            </div>
          ))}
        </div>

        <Tabs defaultValue="produtos">
          <TabsList className="bg-secondary border border-border/50">
            <TabsTrigger value="produtos">Produtos</TabsTrigger>
            <TabsTrigger value="movimentacoes">Movimentações</TabsTrigger>
            <TabsTrigger value="alertas" className="gap-2">
              Alertas
              {alertas.length > 0 && (
                <span className="w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold" style={{ background: "oklch(0.6 0.2 30)", color: "white" }}>
                  {alertas.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="produtos" className="mt-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar produto..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-secondary border-border/50" />
            </div>

            <div className="metric-card rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["Produto", "Categoria", "Qtd. Estoque", "Preço", "Fornecedor", "Status"].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3.5">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p, i) => {
                    const cfg = statusConfig[p.status]
                    return (
                      <tr key={p.id} className="hover:bg-secondary/30 transition-colors" style={{ borderBottom: i < filtered.length - 1 ? "1px solid var(--border)" : "none" }}>
                        <td className="px-5 py-3.5 font-medium">{p.nome}</td>
                        <td className="px-5 py-3.5 text-muted-foreground">{p.categoria}</td>
                        <td className="px-5 py-3.5">
                          <span className={p.qtd <= p.minimo ? "font-bold" : "text-muted-foreground"} style={{ color: p.qtd === 0 ? "oklch(0.55 0.22 25)" : p.qtd <= p.minimo ? "oklch(0.6 0.2 30)" : "" }}>
                            {p.qtd} un.
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-semibold">R$ {p.preco.toFixed(2)}</td>
                        <td className="px-5 py-3.5 text-muted-foreground">{p.fornecedor}</td>
                        <td className="px-5 py-3.5">
                          <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ color: cfg.color, background: cfg.bg }}>{cfg.label}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="movimentacoes" className="mt-4 space-y-3">
            <Button size="sm" className="gap-2" style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}>
              <Plus className="w-4 h-4" /> Registre Movimentação
            </Button>
            {movimentacoes.map((m, i) => (
              <div key={i} className="metric-card rounded-xl p-4 flex items-center gap-4">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center`} style={{ background: m.tipo === "compra" ? "oklch(0.65 0.2 200 / 0.15)" : "oklch(0.7 0.22 145 / 0.15)" }}>
                  {m.tipo === "compra"
                    ? <TrendingUp className="w-4 h-4" style={{ color: "oklch(0.65 0.2 200)" }} />
                    : <TrendingDown className="w-4 h-4" style={{ color: "oklch(0.7 0.22 145)" }} />
                  }
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{m.produto}</p>
                  <p className="text-xs text-muted-foreground">{m.tipo === "compra" ? "Entrada" : "Saída"} · {m.qtd} unidades · {m.data}</p>
                </div>
                <span className="font-semibold text-sm" style={{ color: m.tipo === "compra" ? "oklch(0.65 0.2 200)" : "oklch(0.7 0.22 145)" }}>
                  {m.tipo === "compra" ? "-" : "+"} R$ {m.valor.toFixed(2)}
                </span>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="alertas" className="mt-4 space-y-3">
            {alertas.map((p, i) => {
              const cfg = statusConfig[p.status]
              return (
                <div key={i} className="metric-card rounded-xl p-4 flex items-center gap-4">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: cfg.bg }}>
                    <AlertTriangle className="w-4 h-4" style={{ color: cfg.color }} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{p.nome}</p>
                    <p className="text-xs text-muted-foreground">{p.qtd} em estoque · Mínimo: {p.minimo}</p>
                  </div>
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ color: cfg.color, background: cfg.bg }}>{cfg.label}</span>
                  <Button size="sm" variant="outline" className="border-border/50 text-xs gap-1.5">
                    <ShoppingCart className="w-3 h-3" /> Comprar
                  </Button>
                </div>
              )
            })}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
