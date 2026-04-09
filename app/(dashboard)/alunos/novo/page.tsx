"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/layout/navbar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowLeft } from "lucide-react"
import { ALUNOS_CHANGED_EVENT } from "@/lib/hooks/use-alunos-count"

export default function NovoAlunoPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nome, setNome] = useState("")
  const [email, setEmail] = useState("")
  const [telefone, setTelefone] = useState("")
  const [objetivo, setObjetivo] = useState("")
  const [plano, setPlano] = useState<string>("")
  const [status, setStatus] = useState<string>("ativo")
  const [peso, setPeso] = useState("")
  const [altura, setAltura] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const res = await fetch("/api/alunos", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome,
          email: email.trim() || null,
          telefone: telefone.trim() || null,
          objetivo: objetivo.trim() || null,
          plano: plano || null,
          status,
          peso: peso.trim() || null,
          altura: altura.trim() || null,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string; id?: number }

      if (res.status === 401) {
        window.location.href = "/login"
        return
      }
      if (!res.ok) {
        setError(data.error ?? "Não foi possível salvar o aluno.")
        return
      }
      window.dispatchEvent(new Event(ALUNOS_CHANGED_EVENT))
      if (data.id != null) {
        router.push(`/alunos/${data.id}`)
        router.refresh()
      } else {
        router.push("/alunos")
        router.refresh()
      }
    } catch {
      setError("Erro de conexão. Tente novamente.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <Navbar title="Novo aluno" subtitle="Cadastre um aluno na academia" />

      <div className="p-6 max-w-xl space-y-6">
        <Link
          href="/alunos"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para Alunos
        </Link>

        <form onSubmit={handleSubmit} className="metric-card rounded-xl p-6 space-y-5">
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="nome">Nome completo *</Label>
            <Input
              id="nome"
              name="nome"
              required
              autoComplete="name"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Maria Silva"
              className="bg-secondary border-border/50"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@exemplo.com"
                className="bg-secondary border-border/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                name="telefone"
                autoComplete="tel"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(11) 99999-0000"
                className="bg-secondary border-border/50"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="objetivo">Objetivo</Label>
            <Input
              id="objetivo"
              name="objetivo"
              value={objetivo}
              onChange={(e) => setObjetivo(e.target.value)}
              placeholder="Ex.: Hipertrofia, emagrecimento…"
              className="bg-secondary border-border/50"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Plano</Label>
              <Select value={plano || "none"} onValueChange={(v) => setPlano(v === "none" ? "" : v)}>
                <SelectTrigger className="w-full bg-secondary border-border/50">
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  <SelectItem value="Básico">Básico</SelectItem>
                  <SelectItem value="Premium">Premium</SelectItem>
                  <SelectItem value="VIP">VIP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-full bg-secondary border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="peso">Peso (kg)</Label>
              <Input
                id="peso"
                name="peso"
                inputMode="decimal"
                value={peso}
                onChange={(e) => setPeso(e.target.value)}
                placeholder="Ex.: 72.5"
                className="bg-secondary border-border/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="altura">Altura (cm)</Label>
              <Input
                id="altura"
                name="altura"
                inputMode="numeric"
                value={altura}
                onChange={(e) => setAltura(e.target.value)}
                placeholder="Ex.: 175"
                className="bg-secondary border-border/50"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              type="submit"
              disabled={saving || !nome.trim()}
              className="font-semibold"
              style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
            >
              {saving ? "Salvando…" : "Cadastrar aluno"}
            </Button>
            <Button type="button" variant="outline" className="border-border/50" asChild>
              <Link href="/alunos">Cancelar</Link>
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
