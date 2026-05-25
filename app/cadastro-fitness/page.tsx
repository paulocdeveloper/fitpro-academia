"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Zap, ArrowRight, Dumbbell } from "lucide-react"
import { USUARIO_HOME } from "@/lib/auth/route-access"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function CadastroFitnessPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nome, setNome] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch("/api/auth/register-fitness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ nome, email, password }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        setError(data.error ?? "Não foi possível criar a conta.")
        return
      }
      router.push(USUARIO_HOME)
      router.refresh()
    } catch {
      setError("Erro de conexão.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-8 sm:px-6"
      style={{ background: "var(--background)" }}
    >
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center neon-glow"
            style={{ background: "var(--primary)" }}
          >
            <Zap className="w-6 h-6" style={{ color: "var(--primary-foreground)" }} />
          </div>
          <div>
            <h1
              className="text-2xl sm:text-3xl font-bold"
              style={{ fontFamily: "var(--font-space-grotesk)" }}
            >
              Criar conta fitness
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              Treino inteligente, nutrição com IA e evolução corporal — sem vínculo com academia SaaS.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 metric-card rounded-xl p-5 sm:p-6">
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="nome">Nome</Label>
            <Input
              id="nome"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="h-11 bg-secondary border-border/50"
              placeholder="Seu nome"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 bg-secondary border-border/50"
              placeholder="seu@email.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="senha">Senha</Label>
            <Input
              id="senha"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 bg-secondary border-border/50"
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 font-semibold gap-2"
            style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
          >
            {loading ? (
              <span className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Dumbbell className="w-4 h-4" />
                Começar no app fitness
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </form>

        <p className="text-sm text-center text-muted-foreground">
          Já tem conta?{" "}
          <Link href="/login" className="neon-text hover:underline font-medium">
            Entrar na conta
          </Link>
        </p>
        <p className="text-xs text-center text-muted-foreground">
          É dono de academia?{" "}
          <Link href="/cadastro" className="hover:underline">
            Criar conta e academia (SaaS)
          </Link>
        </p>
      </div>
    </div>
  )
}
