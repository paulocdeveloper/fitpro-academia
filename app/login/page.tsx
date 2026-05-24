"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Zap, Eye, EyeOff, ArrowRight, Dumbbell, Users, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function LoginPage() {
  const router = useRouter()
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        setError(data.error ?? "Não foi possível entrar.")
        return
      }
      const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null
      const next = params?.get("next")
      router.push(next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard")
      router.refresh()
    } catch {
      setError("Erro de conexão.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: "var(--background)" }}>
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12" style={{ background: "var(--card)", borderRight: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center neon-glow" style={{ background: "var(--primary)" }}>
            <Zap className="w-5 h-5" style={{ color: "var(--primary-foreground)" }} />
          </div>
          <span className="font-bold text-xl" style={{ fontFamily: "var(--font-space-grotesk)" }}>FitPro</span>
        </div>

        <div className="space-y-8">
          <div>
            <h2 className="text-4xl font-bold leading-tight mb-4" style={{ fontFamily: "var(--font-space-grotesk)" }}>
              Gerencie sua academia com
              <span className="block neon-text">inteligência e precisão.</span>
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Controle alunos, treinos, nutrição e financeiro em um único painel moderno e poderoso.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {[
              { icon: Users, title: "Gestão de Alunos", desc: "Perfis completos, histórico e evolução" },
              { icon: Dumbbell, title: "Treinos Personalizados", desc: "Monte treinos com exercícios e vídeos" },
              { icon: BarChart3, title: "Relatórios Financeiros", desc: "Controle de pagamentos e inadimplência" },
            ].map((feat, i) => (
              <div key={i} className="flex items-start gap-4 p-4 rounded-xl" style={{ background: "var(--secondary)" }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "var(--neon-dim)" }}>
                  <feat.icon className="w-5 h-5 neon-text" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{feat.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{feat.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          © 2026 FitPro. Todos os direitos reservados.
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center neon-glow" style={{ background: "var(--primary)" }}>
              <Zap className="w-5 h-5" style={{ color: "var(--primary-foreground)" }} />
            </div>
            <span className="font-bold text-xl" style={{ fontFamily: "var(--font-space-grotesk)" }}>FitPro</span>
          </div>

          <div>
            <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "var(--font-space-grotesk)" }}>
              Entrar na conta
            </h1>
            <p className="text-muted-foreground">
              Acesse com o e-mail e a senha da sua conta FitPro Academia.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">{error}</p>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">E-mail</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 bg-secondary border-border/50 focus:border-primary/50"
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="senha" className="text-sm font-medium">Senha</Label>
                <Link href="#" className="text-xs neon-text hover:underline">Esqueci a senha</Link>
              </div>
              <div className="relative">
                <Input
                  id="senha"
                  type={showPass ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 pr-10 bg-secondary border-border/50 focus:border-primary/50"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 font-semibold gap-2 neon-glow transition-all"
              style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
              disabled={loading}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Acessar Dashboard
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          <p className="text-sm text-center text-muted-foreground">
            Nova academia no FitPro?{" "}
            <Link href="/cadastro" className="neon-text hover:underline font-medium">
              Criar conta e academia
            </Link>
          </p>

        </div>
      </div>
    </div>
  )
}
