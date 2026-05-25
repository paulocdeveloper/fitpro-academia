"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/layout/navbar"
import { Button } from "@/components/ui/button"
import { PremiumBadge } from "@/components/premium/premium-badge"
import { PerfilTreinoForm } from "@/components/treino-inteligente/perfil-treino-form"
import { useSessionUser } from "@/lib/hooks/use-session-user"
import type { PerfilTreinoInteligente } from "@/lib/treino-inteligente/generator"
import {
  friendlyFetchError,
  logPerfilSubmit,
  normalizePerfil,
  parseJsonResponse,
} from "@/lib/treino-inteligente/perfil-schema"
import { Brain, CreditCard, LogOut, Sparkles } from "lucide-react"
import { toast } from "sonner"

export function PerfilFitnessView() {
  const router = useRouter()
  const { user, loading: userLoading } = useSessionUser()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [perfil, setPerfil] = useState<PerfilTreinoInteligente | null>(null)
  const [formKey, setFormKey] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/treino-inteligente", { credentials: "include" })
      let data: { error?: string; perfil?: PerfilTreinoInteligente }
      data = await parseJsonResponse<typeof data>(res)
      if (!res.ok) throw new Error(data.error ?? "Erro")
      setPerfil(normalizePerfil(data.perfil))
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

  async function salvar(draft: PerfilTreinoInteligente) {
    setSaving(true)
    try {
      logPerfilSubmit("api-put-request", draft)
      const res = await fetch("/api/treino-inteligente", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      })
      const data = await parseJsonResponse<{
        error?: string
        perfil?: PerfilTreinoInteligente
        fieldErrors?: Record<string, string>
      }>(res)
      logPerfilSubmit("api-put-response", { status: res.status, ok: res.ok, data })
      if (!res.ok) {
        const msg = data.error ?? Object.values(data.fieldErrors ?? {})[0] ?? "Erro ao salvar"
        throw new Error(msg)
      }
      toast.success("Perfil atualizado!")
      setPerfil(normalizePerfil(data.perfil))
      setFormKey((k) => k + 1)
    } catch (e) {
      toast.error(friendlyFetchError(e))
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
            <PerfilTreinoForm
              key={formKey}
              perfil={perfil}
              onChange={setPerfil}
              onSave={salvar}
              saving={saving}
            />
            <Button variant="outline" asChild className="w-full">
              <Link href="/treino-inteligente">
                <Brain className="h-4 w-4 mr-2 inline" />
                Ver IA Treino
              </Link>
            </Button>
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
