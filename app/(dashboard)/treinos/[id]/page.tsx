"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Navbar } from "@/components/layout/navbar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft } from "lucide-react"
import type { UserRole } from "@/lib/auth/roles"
import { canViewAllTreinos } from "@/lib/auth/roles"
import { canMutateTreino } from "@/lib/auth/treinos-access"

type Me = { id: number; email: string; role: UserRole; academiaId?: number }

type ApiTreino = {
  id: number
  user_id: number
  nome: string
  categoria: string | null
  status: string
  exercicios: unknown[]
  aluno: string
}

export default function TreinoDetalhePage() {
  const params = useParams()
  const router = useRouter()
  const id = typeof params.id === "string" ? params.id : ""

  const [me, setMe] = useState<Me | null>(null)
  const [treino, setTreino] = useState<ApiTreino | null>(null)
  const [forbidden, setForbidden] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [nome, setNome] = useState("")
  const [categoria, setCategoria] = useState("")
  const [status, setStatus] = useState("ativo")
  const [userIdField, setUserIdField] = useState("")
  const [exJson, setExJson] = useState("[]")

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setForbidden(false)
    setNotFound(false)
    try {
      const [meRes, tRes] = await Promise.all([
        fetch("/api/auth/me", { credentials: "include" }),
        fetch(`/api/treinos/${id}`, { credentials: "include" }),
      ])
      if (meRes.ok) {
        const j = (await meRes.json()) as { user: Me }
        setMe(j.user)
      }
      if (tRes.status === 401) {
        window.location.href = "/login"
        return
      }
      if (tRes.status === 403) {
        setForbidden(true)
        setTreino(null)
        return
      }
      if (tRes.status === 404) {
        setNotFound(true)
        setTreino(null)
        return
      }
      if (!tRes.ok) {
        setNotFound(true)
        return
      }
      const t = (await tRes.json()) as ApiTreino
      setTreino(t)
      setNome(t.nome)
      setCategoria(t.categoria ?? "")
      setStatus(t.status)
      setUserIdField(String(t.user_id))
      setExJson(JSON.stringify(t.exercicios ?? [], null, 2))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  const canEdit = me && treino && canMutateTreino(me.role, me.id, treino.user_id)

  const handleSave = async () => {
    if (!me || !treino || !canEdit) return
    let exercises: unknown
    try {
      exercises = JSON.parse(exJson)
      if (!Array.isArray(exercises)) throw new Error("exercicios deve ser um array JSON")
    } catch {
      alert("JSON de exercícios inválido.")
      return
    }
    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        nome,
        categoria: categoria.trim() || null,
        status,
        exercicios: exercises,
      }
      if (canViewAllTreinos(me.role)) {
        const uid = Number(userIdField)
        if (Number.isFinite(uid) && uid > 0) body.user_id = uid
      }
      const res = await fetch(`/api/treinos/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (res.status === 403) {
        setForbidden(true)
        return
      }
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        alert(j.error ?? "Erro ao salvar.")
        return
      }
      router.refresh()
      await load()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!treino || !canEdit) return
    if (!confirm("Excluir este treino?")) return
    const res = await fetch(`/api/treinos/${id}`, { method: "DELETE", credentials: "include" })
    if (res.status === 403) {
      setForbidden(true)
      return
    }
    if (!res.ok) {
      alert("Não foi possível excluir.")
      return
    }
    router.push("/treinos")
  }

  if (loading) {
    return <div className="p-6 text-muted-foreground text-sm">Carregando…</div>
  }

  if (forbidden) {
    return (
      <div>
        <Navbar title="Acesso negado" subtitle="Você não tem permissão para este treino." />
        <div className="p-6 space-y-4 max-w-lg">
          <p className="text-sm text-muted-foreground">
            Este treino pertence a outro usuário. Apenas o dono ou usuários <strong>admin</strong>/<strong>personal</strong> podem abri-lo.
          </p>
          <Button variant="outline" asChild>
            <Link href="/treinos">Voltar para Treinos</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (notFound || !treino) {
    return (
      <div>
        <Navbar title="Treino não encontrado" />
        <div className="p-6">
          <Button variant="outline" asChild>
            <Link href="/treinos">Voltar</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Navbar title={treino.nome} subtitle={`Aluno: ${treino.aluno} · user_id ${treino.user_id}`} />

      <div className="p-6 max-w-2xl space-y-6">
        <Link href="/treinos" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Voltar para Treinos
        </Link>

        {canEdit ? (
          <div className="metric-card rounded-xl p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} className="bg-secondary border-border/50" />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cat">Categoria</Label>
                <Input id="cat" value={categoria} onChange={(e) => setCategoria(e.target.value)} className="bg-secondary border-border/50" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="st">Status</Label>
                <Input id="st" value={status} onChange={(e) => setStatus(e.target.value)} className="bg-secondary border-border/50" />
              </div>
            </div>
            {me && canViewAllTreinos(me.role) && (
              <div className="space-y-2">
                <Label htmlFor="uid">user_id (dono)</Label>
                <Input id="uid" value={userIdField} onChange={(e) => setUserIdField(e.target.value)} className="bg-secondary border-border/50" />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="ex">Exercícios (JSON array)</Label>
              <Textarea id="ex" value={exJson} onChange={(e) => setExJson(e.target.value)} rows={12} className="font-mono text-xs bg-secondary border-border/50" />
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                className="font-semibold"
                style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
                disabled={saving}
                onClick={() => void handleSave()}
              >
                {saving ? "Salvando…" : "Salvar"}
              </Button>
              <Button type="button" variant="destructive" onClick={() => void handleDelete()}>
                Excluir
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Você pode visualizar este treino, mas só o dono ou admin/personal podem editar ou excluir.
          </p>
        )}
      </div>
    </div>
  )
}
