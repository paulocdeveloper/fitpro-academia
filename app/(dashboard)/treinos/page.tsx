"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Navbar } from "@/components/layout/navbar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Dumbbell, Search, GripVertical, Trash2, Edit, PlayCircle,
  Clock, RotateCcw, Weight, ChevronDown, ChevronUp, Users,
} from "lucide-react"
import type { UserRole } from "@/lib/auth/roles"
import { canViewAllTreinos } from "@/lib/auth/roles"
import { canMutateTreino } from "@/lib/auth/treinos-access"

type ApiExercicio = {
  nome?: string
  series?: number
  reps?: string
  descanso?: string
  carga?: string
  video?: boolean
}

type ApiTreino = {
  id: number
  user_id: number
  nome: string
  categoria: string | null
  status: string
  exercicios: ApiExercicio[]
  aluno: string
}

type Me = {
  id: number
  role: UserRole
  academiaId?: number
  displayName?: string
  roleLabel?: string
}

function TreinoCard({
  treino,
  me,
  onDeleted,
}: {
  treino: ApiTreino
  me: Me
  onDeleted: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const canMutate = canMutateTreino(me.role, me.id, treino.user_id)
  const exList = Array.isArray(treino.exercicios) ? treino.exercicios : []

  const handleDelete = async () => {
    if (!confirm("Excluir este treino?")) return
    const res = await fetch(`/api/treinos/${treino.id}`, { method: "DELETE", credentials: "include" })
    if (res.status === 403) {
      alert("Acesso negado.")
      return
    }
    if (!res.ok) {
      alert("Não foi possível excluir.")
      return
    }
    onDeleted()
  }

  return (
    <div className="metric-card rounded-xl overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--neon-dim)" }}>
              <Dumbbell className="w-5 h-5 neon-text" />
            </div>
            <div className="min-w-0">
              <Link href={`/treinos/${treino.id}`} className="font-semibold hover:neon-text transition-colors block truncate" style={{ fontFamily: "var(--font-space-grotesk)" }}>
                {treino.nome}
              </Link>
              <div className="flex flex-wrap items-center gap-3 mt-1.5">
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Users className="w-3 h-3 shrink-0" />
                  {treino.aluno}
                </span>
                {treino.categoria && (
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--secondary)", color: "var(--muted-foreground)" }}>
                    {treino.categoria}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">#{treino.user_id}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground hidden sm:inline">{exList.length} exercícios</span>
            {canMutate && (
              <>
                <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-foreground" asChild>
                  <Link href={`/treinos/${treino.id}`} aria-label="Editar treino">
                    <Edit className="w-4 h-4" />
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-8 h-8 text-muted-foreground hover:text-destructive"
                  type="button"
                  aria-label="Excluir treino"
                  onClick={() => void handleDelete()}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>
            )}
            <Button
              variant="ghost" size="icon"
              className="w-8 h-8 text-muted-foreground hover:text-primary"
              type="button"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: "1px solid var(--border)" }}>
          <div className="px-5 py-2 grid grid-cols-5 gap-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <span className="col-span-2">Exercício</span>
            <span>Séries × Reps</span>
            <span>Descanso</span>
            <span>Carga</span>
          </div>
          {exList.length === 0 && (
            <p className="px-5 py-4 text-sm text-muted-foreground">Nenhum exercício cadastrado.</p>
          )}
          {exList.map((ex, i) => (
            <div
              key={i}
              className="px-5 py-3 grid grid-cols-5 gap-4 items-center text-sm transition-colors hover:bg-secondary/30"
              style={{ borderTop: "1px solid var(--border)" }}
            >
              <div className="col-span-2 flex items-center gap-3 min-w-0">
                <GripVertical className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                <span className="font-medium truncate">{ex.nome ?? "—"}</span>
                {ex.video && (
                  <PlayCircle className="w-3.5 h-3.5 neon-text flex-shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <RotateCcw className="w-3 h-3 shrink-0" />
                <span>{ex.series ?? "—"} × {ex.reps ?? "—"}</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="w-3 h-3 shrink-0" />
                <span>{ex.descanso ?? "—"}</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Weight className="w-3 h-3 shrink-0" />
                <span>{ex.carga ?? "—"}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function TreinosPage() {
  const [me, setMe] = useState<Me | null>(null)
  const [treinos, setTreinos] = useState<ApiTreino[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [novoNome, setNovoNome] = useState("")
  const [novoCategoria, setNovoCategoria] = useState("")
  const [novoUserId, setNovoUserId] = useState("")

  const load = useCallback(async () => {
    setErr(null)
    setLoading(true)
    try {
      const [meRes, tRes] = await Promise.all([
        fetch("/api/auth/me", { credentials: "include" }),
        fetch("/api/treinos", { credentials: "include" }),
      ])
      if (meRes.status === 401) {
        window.location.href = "/login"
        return
      }
      if (!meRes.ok) {
        setErr("Não foi possível carregar sessão.")
        return
      }
      const meJson = (await meRes.json()) as { user: Me }
      setMe(meJson.user)

      if (tRes.status === 401) {
        window.location.href = "/login"
        return
      }
      if (!tRes.ok) {
        const j = (await tRes.json().catch(() => ({}))) as { error?: string; details?: string }
        const msg = [j.error, j.details].filter(Boolean).join(" — ")
        setErr(msg || "Erro ao carregar treinos.")
        setTreinos([])
        return
      }
      setTreinos((await tRes.json()) as ApiTreino[])
    } catch {
      setErr("Erro de conexão.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = treinos.filter((t) => {
    const q = search.toLowerCase()
    return (
      t.nome.toLowerCase().includes(q) ||
      t.aluno.toLowerCase().includes(q) ||
      String(t.user_id).includes(q)
    )
  })

  const handleCreate = async () => {
    if (!novoNome.trim() || !me) return
    setCreating(true)
    try {
      const body: Record<string, unknown> = {
        nome: novoNome.trim(),
        categoria: novoCategoria.trim() || null,
        exercicios: [],
      }
      if (canViewAllTreinos(me.role)) {
        const uid = Number(novoUserId)
        if (Number.isFinite(uid) && uid > 0) body.user_id = uid
      }
      const res = await fetch("/api/treinos", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (res.status === 401) {
        window.location.href = "/login"
        return
      }
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        alert(j.error ?? "Erro ao criar treino.")
        return
      }
      setDialogOpen(false)
      setNovoNome("")
      setNovoCategoria("")
      setNovoUserId("")
      await load()
    } finally {
      setCreating(false)
    }
  }

  if (loading && !me) {
    return (
      <div className="p-6 text-muted-foreground text-sm">Carregando…</div>
    )
  }

  return (
    <div>
      <Navbar
        title="Treinos"
        subtitle={
          me
            ? `${me.displayName ?? "Conta"} · ${me.roleLabel ?? me.role}`
            : "Treinos"
        }
        action={
          me
            ? {
                label: "Novo Treino",
                onClick: () => setDialogOpen(true),
              }
            : undefined
        }
      />

      <div className="p-6 space-y-5">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar treino ou aluno…"
              className="pl-9 bg-secondary border-border/50"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button type="button" className="sm:hidden font-semibold" style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}>
                Novo Treino
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle>Novo treino</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="nt-nome">Nome</Label>
                  <Input id="nt-nome" value={novoNome} onChange={(e) => setNovoNome(e.target.value)} className="bg-secondary border-border/50" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nt-cat">Categoria</Label>
                  <Input id="nt-cat" value={novoCategoria} onChange={(e) => setNovoCategoria(e.target.value)} className="bg-secondary border-border/50" />
                </div>
                {me && canViewAllTreinos(me.role) && (
                  <div className="space-y-2">
                    <Label htmlFor="nt-uid">ID do aluno (usuarios.id)</Label>
                    <Input
                      id="nt-uid"
                      inputMode="numeric"
                      placeholder="Opcional — padrão: você"
                      value={novoUserId}
                      onChange={(e) => setNovoUserId(e.target.value)}
                      className="bg-secondary border-border/50"
                    />
                  </div>
                )}
                <Button
                  type="button"
                  className="w-full font-semibold"
                  style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
                  disabled={creating || !novoNome.trim()}
                  onClick={() => void handleCreate()}
                >
                  {creating ? "Salvando…" : "Criar"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {me && (
          <p className="text-xs text-muted-foreground">
            {canViewAllTreinos(me.role)
              ? "Você vê todos os treinos. Alunos veem apenas os próprios."
              : "Você vê apenas treinos em que é o dono (user_id)."}
          </p>
        )}

        {err && (
          <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">{err}</p>
        )}

        {!err && me && (
          <div className="space-y-4">
            {filtered.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum treino encontrado.</p>
            )}
            {filtered.map((treino) => (
              <TreinoCard key={treino.id} treino={treino} me={me} onDeleted={load} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
