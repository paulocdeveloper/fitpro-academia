"use client"

import { useState } from "react"
import Link from "next/link"
import { Navbar } from "@/components/layout/navbar"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Phone, Mail, Target, Calendar, Weight, Ruler, Edit, Dumbbell, Salad, TrendingUp, CalendarDays } from "lucide-react"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts"

const evolucaoData = [
  { mes: "Jan", peso: 88, gordura: 24, massa: 64 },
  { mes: "Fev", peso: 86, gordura: 22.5, massa: 64.5 },
  { mes: "Mar", peso: 84.5, gordura: 21, massa: 65 },
  { mes: "Abr", peso: 83, gordura: 19.5, massa: 65.5 },
  { mes: "Mai", peso: 82, gordura: 18.5, massa: 66 },
  { mes: "Jun", peso: 81, gordura: 17.5, massa: 66.8 },
]

const treinos = [
  { nome: "Treino A — Peito e Tríceps", exercicios: 6, ultima: "Hoje", status: "ativo" },
  { nome: "Treino B — Costas e Bíceps", exercicios: 7, ultima: "Ontem", status: "ativo" },
  { nome: "Treino C — Pernas e Ombros", exercicios: 8, ultima: "3 dias", status: "ativo" },
]

const dieta = [
  { refeicao: "Café da Manhã", horario: "07:00", calorias: 450, alimentos: "Ovos mexidos, pão integral, banana, café" },
  { refeicao: "Almoço", horario: "12:00", calorias: 780, alimentos: "Frango grelhado, arroz integral, brócolis, salada" },
  { refeicao: "Lanche", horario: "15:30", calorias: 280, alimentos: "Whey protein, frutas, castanhas" },
  { refeicao: "Jantar", horario: "19:00", calorias: 620, alimentos: "Salmão, batata doce, aspargos, salada" },
]

const agenda = [
  { data: "Hoje 07:00", tipo: "Treino A", status: "concluido" },
  { data: "Amanhã 07:00", tipo: "Treino B", status: "agendado" },
  { data: "Qui 10:00", tipo: "Avaliação Física", status: "agendado" },
  { data: "Sex 07:00", tipo: "Treino C", status: "agendado" },
]

export default function AlunoPerfilPage() {
  const aluno = {
    nome: "Carlos Silva",
    email: "carlos@email.com",
    telefone: "(11) 99234-5678",
    objetivo: "Hipertrofia",
    peso: 82,
    altura: 178,
    idade: 28,
    plano: "Premium",
    personal: "Dr. Marcos Lima",
    inicio: "Janeiro 2024",
    imc: (82 / (1.78 * 1.78)).toFixed(1),
  }

  return (
    <div>
      <Navbar title="Perfil do Aluno" subtitle={aluno.nome} />

      <div className="p-6 space-y-6">
        {/* Back */}
        <Link href="/alunos" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Voltar para Alunos
        </Link>

        {/* Header */}
        <div className="metric-card rounded-xl p-6 flex flex-col md:flex-row items-start md:items-center gap-6">
          <Avatar className="w-20 h-20">
            <AvatarFallback style={{ background: "oklch(0.5 0.18 175)", color: "white", fontSize: "24px", fontFamily: "var(--font-space-grotesk)" }}>
              CS
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-2xl font-bold" style={{ fontFamily: "var(--font-space-grotesk)" }}>{aluno.nome}</h2>
                <p className="text-muted-foreground mt-0.5">Personal: {aluno.personal} · Desde {aluno.inicio}</p>
                <div className="flex items-center gap-4 mt-3 flex-wrap">
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground"><Mail className="w-3.5 h-3.5" />{aluno.email}</span>
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground"><Phone className="w-3.5 h-3.5" />{aluno.telefone}</span>
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground"><Target className="w-3.5 h-3.5" />{aluno.objetivo}</span>
                </div>
              </div>
              <Button variant="outline" size="sm" className="gap-2 border-border/50">
                <Edit className="w-4 h-4" /> Editar
              </Button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Weight, label: "Peso Atual", value: `${aluno.peso} kg`, accent: "var(--primary)" },
            { icon: Ruler, label: "Altura", value: `${aluno.altura} cm`, accent: "oklch(0.65 0.2 200)" },
            { icon: Calendar, label: "Idade", value: `${aluno.idade} anos`, accent: "oklch(0.75 0.18 80)" },
            { icon: Target, label: "IMC", value: aluno.imc, accent: "oklch(0.65 0.22 280)" },
          ].map((s) => (
            <div key={s.label} className="metric-card rounded-xl p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${s.accent}20` }}>
                <s.icon className="w-4 h-4" style={{ color: s.accent }} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="font-bold text-lg" style={{ fontFamily: "var(--font-space-grotesk)" }}>{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="evolucao">
          <TabsList className="bg-secondary border border-border/50">
            <TabsTrigger value="evolucao" className="gap-2 data-[state=active]:text-primary"><TrendingUp className="w-3.5 h-3.5" />Evolução</TabsTrigger>
            <TabsTrigger value="treinos" className="gap-2 data-[state=active]:text-primary"><Dumbbell className="w-3.5 h-3.5" />Treinos</TabsTrigger>
            <TabsTrigger value="dieta" className="gap-2 data-[state=active]:text-primary"><Salad className="w-3.5 h-3.5" />Dieta</TabsTrigger>
            <TabsTrigger value="agenda" className="gap-2 data-[state=active]:text-primary"><CalendarDays className="w-3.5 h-3.5" />Agenda</TabsTrigger>
          </TabsList>

          <TabsContent value="evolucao" className="mt-4">
            <div className="metric-card rounded-xl p-5">
              <h3 className="font-semibold mb-4" style={{ fontFamily: "var(--font-space-grotesk)" }}>Evolução Corporal</h3>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={evolucaoData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.01 260)" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "oklch(0.55 0.01 260)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "oklch(0.55 0.01 260)" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "oklch(0.13 0.008 260)", border: "1px solid oklch(0.22 0.01 260)", borderRadius: "8px" }} />
                  <Line type="monotone" dataKey="peso" name="Peso (kg)" stroke="oklch(0.7 0.22 145)" strokeWidth={2} dot={{ fill: "oklch(0.7 0.22 145)", r: 4 }} />
                  <Line type="monotone" dataKey="massa" name="Massa Muscular" stroke="oklch(0.65 0.2 200)" strokeWidth={2} dot={{ fill: "oklch(0.65 0.2 200)", r: 4 }} />
                  <Line type="monotone" dataKey="gordura" name="Gordura %" stroke="oklch(0.6 0.2 30)" strokeWidth={2} dot={{ fill: "oklch(0.6 0.2 30)", r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="treinos" className="mt-4 space-y-3">
            {treinos.map((t, i) => (
              <div key={i} className="metric-card rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "var(--neon-dim)" }}>
                    <Dumbbell className="w-5 h-5 neon-text" />
                  </div>
                  <div>
                    <p className="font-medium">{t.nome}</p>
                    <p className="text-sm text-muted-foreground">{t.exercicios} exercícios · Último: {t.ultima}</p>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="border-border/50">Ver treino</Button>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="dieta" className="mt-4 space-y-3">
            {dieta.map((r, i) => (
              <div key={i} className="metric-card rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{r.refeicao}</span>
                    <span className="text-xs text-muted-foreground">{r.horario}</span>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "var(--neon-dim)", color: "var(--neon)" }}>
                    {r.calorias} kcal
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{r.alimentos}</p>
              </div>
            ))}
            <div className="metric-card rounded-xl p-4 flex items-center justify-between">
              <span className="font-semibold">Total Diário</span>
              <span className="font-bold neon-text text-lg" style={{ fontFamily: "var(--font-space-grotesk)" }}>
                {dieta.reduce((s, r) => s + r.calorias, 0)} kcal
              </span>
            </div>
          </TabsContent>

          <TabsContent value="agenda" className="mt-4 space-y-3">
            {agenda.map((ev, i) => (
              <div key={i} className="metric-card rounded-xl p-4 flex items-center gap-4">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: ev.status === "concluido" ? "var(--neon-dim)" : "var(--secondary)" }}>
                  <CalendarDays className="w-4 h-4" style={{ color: ev.status === "concluido" ? "var(--neon)" : "var(--muted-foreground)" }} />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{ev.tipo}</p>
                  <p className="text-sm text-muted-foreground">{ev.data}</p>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${ev.status === "concluido" ? "status-pago" : "status-pendente"}`}>
                  {ev.status === "concluido" ? "Concluído" : "Agendado"}
                </span>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
