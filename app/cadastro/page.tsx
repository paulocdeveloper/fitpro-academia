"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Zap, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function CadastroAcademiaPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nomeAcademia, setNomeAcademia] = useState("")
  const [nomeAdmin, setNomeAdmin] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch("/api/academias/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ nomeAcademia, nomeAdmin, email, password }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        setError(data.error ?? "Não foi possível criar a academia.")
        return
      }
      router.push("/dashboard")
      router.refresh()
    } catch {
      setError("Erro de conexão.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8" style={{ background: "var(--background)" }}>
      <div className="w-full max-w-md space-y-8">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center neon-glow" style={{ background: "var(--primary)" }}>
            <Zap className="w-5 h-5" style={{ color: "var(--primary-foreground)" }} />
          </div>
          <span className="font-bold text-xl" style={{ fontFamily: "var(--font-space-grotesk)" }}>
            FitPro — Nova academia
          </span>
        </div>

        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-space-grotesk)" }}>
            Criar conta SaaS
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Regista a tua academia e o primeiro administrador. Os dados ficam isolados de outras academias.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="nomeAcademia">Nome da academia</Label>
            <Input
              id="nomeAcademia"
              required
              value={nomeAcademia}
              onChange={(e) => setNomeAcademia(e.target.value)}
              className="h-11 bg-secondary border-border/50"
              placeholder="Ex.: Academia Força Total"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nomeAdmin">O teu nome</Label>
            <Input
              id="nomeAdmin"
              required
              value={nomeAdmin}
              onChange={(e) => setNomeAdmin(e.target.value)}
              className="h-11 bg-secondary border-border/50"
              placeholder="Nome completo"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail (login)</Label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 bg-secondary border-border/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha (mín. 6 caracteres)</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 bg-secondary border-border/50"
            />
          </div>

          <Button
            type="submit"
            className="w-full h-11 font-semibold gap-2 neon-glow"
            style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
            disabled={loading}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                Criar academia e entrar
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </form>

        <p className="text-sm text-center text-muted-foreground">
          Já tens conta?{" "}
          <Link href="/login" className="neon-text hover:underline font-medium">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}
