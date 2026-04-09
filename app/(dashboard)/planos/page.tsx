"use client"

import { Navbar } from "@/components/layout/navbar"
import { Button } from "@/components/ui/button"
import { Check, Zap, Star, Crown, Edit, Trash2, Users } from "lucide-react"

const planos = [
  {
    id: 1,
    nome: "Básico",
    valor: 89.90,
    duracao: "Mensal",
    descricao: "Ideal para quem está começando",
    icon: Zap,
    color: "oklch(0.65 0.2 200)",
    alunos: 68,
    features: [
      "Acesso à academia",
      "Treino personalizado",
      "Acompanhamento básico",
      "App mobile",
    ],
  },
  {
    id: 2,
    nome: "Premium",
    valor: 189.90,
    duracao: "Mensal",
    descricao: "O mais popular entre os alunos",
    icon: Star,
    color: "oklch(0.7 0.22 145)",
    alunos: 121,
    destaque: true,
    features: [
      "Acesso à academia",
      "Treino personalizado",
      "Acompanhamento semanal",
      "Plano nutricional",
      "App mobile",
      "Avaliação física mensal",
    ],
  },
  {
    id: 3,
    nome: "VIP",
    valor: 299.90,
    duracao: "Mensal",
    descricao: "Experiência completa e exclusiva",
    icon: Crown,
    color: "oklch(0.75 0.18 80)",
    alunos: 58,
    features: [
      "Acesso ilimitado",
      "Treino 100% personalizado",
      "Acompanhamento diário",
      "Plano nutricional completo",
      "App mobile premium",
      "Avaliação física quinzenal",
      "Personal exclusivo",
      "Acesso prioritário",
    ],
  },
]

export default function PlanosPage() {
  const totalAlunos = planos.reduce((s, p) => s + p.alunos, 0)
  const receitaTotal = planos.reduce((s, p) => s + p.valor * p.alunos, 0)

  return (
    <div>
      <Navbar title="Planos" subtitle="Gestão de planos da academia" action={{ label: "Novo Plano" }} />

      <div className="p-6 space-y-6">
        {/* Resumo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {planos.map(p => (
            <div key={p.id} className="metric-card rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold" style={{ color: p.color }}>{p.nome}</span>
                <p.icon className="w-4 h-4" style={{ color: p.color }} />
              </div>
              <p className="text-xl font-bold" style={{ fontFamily: "var(--font-space-grotesk)" }}>{p.alunos}</p>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                <Users className="w-3 h-3" /> alunos ativos
              </p>
            </div>
          ))}
          <div className="metric-card rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-2">Receita Planos</p>
            <p className="text-xl font-bold neon-text" style={{ fontFamily: "var(--font-space-grotesk)" }}>
              R$ {(receitaTotal / 1000).toFixed(1)}k
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">por mês</p>
          </div>
        </div>

        {/* Cards dos planos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {planos.map((plano) => {
            const Icon = plano.icon
            return (
              <div
                key={plano.id}
                className={`metric-card rounded-2xl p-6 flex flex-col relative overflow-hidden ${plano.destaque ? "neon-glow" : ""}`}
                style={plano.destaque ? { borderColor: "oklch(0.7 0.22 145 / 0.4)" } : {}}
              >
                {plano.destaque && (
                  <div className="absolute top-4 right-4">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: "var(--neon-dim)", color: "var(--neon)" }}>
                      Mais Popular
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-3 mb-5">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: `${plano.color}20` }}>
                    <Icon className="w-5 h-5" style={{ color: plano.color }} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg" style={{ fontFamily: "var(--font-space-grotesk)" }}>{plano.nome}</h3>
                    <p className="text-xs text-muted-foreground">{plano.descricao}</p>
                  </div>
                </div>

                <div className="mb-5">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold" style={{ fontFamily: "var(--font-space-grotesk)", color: plano.color }}>
                      R$ {plano.valor.toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{plano.duracao}</p>
                </div>

                <ul className="space-y-2.5 flex-1 mb-6">
                  {plano.features.map((feat, i) => (
                    <li key={i} className="flex items-center gap-2.5 text-sm">
                      <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${plano.color}20` }}>
                        <Check className="w-2.5 h-2.5" style={{ color: plano.color }} />
                      </div>
                      <span className="text-muted-foreground">{feat}</span>
                    </li>
                  ))}
                </ul>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="flex-1 gap-2 border-border/50">
                    <Edit className="w-3.5 h-3.5" /> Editar
                  </Button>
                  <Button variant="ghost" size="icon" className="w-9 h-9 text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
