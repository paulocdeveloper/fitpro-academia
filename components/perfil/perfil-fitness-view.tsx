"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/layout/navbar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PremiumBadge } from "@/components/premium/premium-badge"
import { useSessionUser } from "@/lib/hooks/use-session-user"
import type { PerfilTreinoInteligente } from "@/lib/treino-inteligente/generator"
import { Brain, CreditCard, LogOut, RefreshCw, Sparkles } from "lucide-react"
import { toast } from "sonner"

export function PerfilFitnessView() {
  const router = useRouter()
  const { user, loading: userLoading } = useSessionUser()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [perfil, setPerfil] = useState<PerfilTreinoInteligente | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/treino-inteligente", { credentials: "include" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Erro")
      setPerfil(data.perfil)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar perfil")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function salvar() {
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
      if (!res.ok) throw new Error(data.error ?? "Erro")
      toast.success("Perfil atualizado!")
      setPerfil(data.perfil)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar")
    } finally {
      setSaving(false)
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" })
    router.replace("/login")
    router.refresh()
  }

  return (
    <>
      <Navbar title="Perfil" subtitle="Seus dados e preferências de treino" />
      <div className="flex-1 space-y-6 p-4 md:p-6 max-w-2xl mx-auto w-full">
        <div className="rounded-xl border border-border/50 bg-card p-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">Conta</p>
            {!userLoading && (
              <PremiumBadge
                variant={
                  user?.isPremium
                    ? "premium"
                    : user?.subscriptionStatus === "expired"
                      ? "expired"
                      : "free"
                }
              />
            )}
          </div>
          <p className="font-semibold">{userLoading ? "…" : user?.displayName}</p>
          <p className="text-sm text-muted-foreground">{user?.roleLabel}</p>
          {!userLoading && (
            <Button variant="outline" size="sm" asChild className="w-full gap-2 mt-2">
              <Link href="/minha-assinatura">
                <CreditCard className="h-4 w-4" />
                Minha assinatura
              </Link>
            </Button>
          )}
        </div>

        {loading || !perfil ? (
          <p className="text-sm text-muted-foreground animate-pulse">Carregando dados…</p>
        ) : (
          <div className="rounded-xl border border-border/50 bg-card p-4 sm:p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Sparkles className="h-4 w-4 text-primary" />
              Dados para IA Treino
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Peso (kg)</Label>
                <Input
                  type="number"
                  value={perfil.peso_kg}
                  onChange={(e) => setPerfil({ ...perfil, peso_kg: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Altura (cm)</Label>
                <Input
                  type="number"
                  value={perfil.altura_cm}
                  onChange={(e) => setPerfil({ ...perfil, altura_cm: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Idade</Label>
                <Input
                  type="number"
                  value={perfil.idade}
                  onChange={(e) => setPerfil({ ...perfil, idade: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Frequência (x/semana)</Label>
                <Input
                  type="number"
                  min={2}
                  max={6}
                  value={perfil.frequencia_semanal}
                  onChange={(e) =>
                    setPerfil({ ...perfil, frequencia_semanal: Number(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Objetivo</Label>
                <Input
                  value={perfil.objetivo}
                  onChange={(e) => setPerfil({ ...perfil, objetivo: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Nível</Label>
                <Select
                  value={perfil.nivel}
                  onValueChange={(v) =>
                    setPerfil({ ...perfil, nivel: v as PerfilTreinoInteligente["nivel"] })
                  }
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
              </div>
              <div className="space-y-2">
                <Label>Sexo</Label>
                <Select
                  value={perfil.sexo}
                  onValueChange={(v) =>
                    setPerfil({ ...perfil, sexo: v as PerfilTreinoInteligente["sexo"] })
                  }
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
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Limitações físicas</Label>
                <Textarea
                  value={perfil.limitacoes ?? ""}
                  onChange={(e) => setPerfil({ ...perfil, limitacoes: e.target.value })}
                  placeholder="Ex.: joelho, lombar…"
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={salvar} disabled={saving} className="gap-2 flex-1">
                {saving ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Brain className="h-4 w-4" />
                )}
                Salvar e recalcular treino
              </Button>
              <Button variant="outline" asChild className="flex-1">
                <Link href="/treino-inteligente">Ver IA Treino</Link>
              </Button>
            </div>
          </div>
        )}

        <Button variant="outline" onClick={logout} className="w-full gap-2">
          <LogOut className="h-4 w-4" />
          Sair da conta
        </Button>
      </div>
    </>
  )
}
