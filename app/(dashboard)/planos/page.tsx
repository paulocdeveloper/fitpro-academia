"use client"

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react"
import { Navbar } from "@/components/layout/navbar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Check, Edit, Trash2, Users } from "lucide-react"
import { PLANOS_META_BY_SLUG, type PlanoSlug } from "@/lib/planos-meta"
import { toast } from "sonner"

type PlanoApi = {
  id: number
  slug: string
  nome: string
  valor: number
  duracao: string
  descricao: string | null
  destaque: boolean
  alunos: number
}

type PlanoView = PlanoApi & {
  descricaoUi: string
  icon: (typeof PLANOS_META_BY_SLUG)[PlanoSlug]["icon"]
  color: string
  features: string[]
}

function formatValorBR(valor: number) {
  return valor.toFixed(2).replace(".", ",")
}

function valorParaInput(valor: number) {
  return formatValorBR(valor)
}

function parseValorInput(raw: string): number | null {
  const s = raw.trim().replace(/[^\d,.-]/g, "")
  if (!s) return null
  const normalized = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s
  const n = Number.parseFloat(normalized)
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round(n * 100) / 100
}

export default function PlanosPage() {
  const [planos, setPlanos] = useState<PlanoView[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [editOpen, setEditOpen] = useState(false)
  const [editPlano, setEditPlano] = useState<PlanoView | null>(null)
  const [editValor, setEditValor] = useState("")
  const [editError, setEditError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const mergePlanos = useCallback((api: PlanoApi[]): PlanoView[] => {
    return api.map((p) => {
      const meta = PLANOS_META_BY_SLUG[p.slug as PlanoSlug]
      return {
        ...p,
        descricaoUi: p.descricao?.trim() || meta?.descricao || "",
        icon: meta?.icon ?? PLANOS_META_BY_SLUG.basico.icon,
        color: meta?.color ?? "oklch(0.65 0.2 200)",
        features: meta?.features ?? [],
      }
    })
  }, [])

  const fetchPlanos = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await fetch("/api/planos", { credentials: "include" })
      const data = (await res.json()) as PlanoApi[] | { error?: string }
      if (!res.ok) {
        const msg = "error" in data && data.error ? data.error : "Não foi possível carregar os planos."
        throw new Error(msg)
      }
      setPlanos(mergePlanos(data as PlanoApi[]))
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Erro ao carregar planos.")
    } finally {
      setLoading(false)
    }
  }, [mergePlanos])

  useEffect(() => {
    void fetchPlanos()
  }, [fetchPlanos])

  const receitaTotal = useMemo(
    () => planos.reduce((s, p) => s + p.valor * p.alunos, 0),
    [planos],
  )

  function openEdit(plano: PlanoView) {
    setEditPlano(plano)
    setEditValor(valorParaInput(plano.valor))
    setEditError(null)
    setEditOpen(true)
  }

  async function handleSaveValor(e: FormEvent) {
    e.preventDefault()
    if (!editPlano) return

    const valor = parseValorInput(editValor)
    if (valor == null) {
      setEditError("Informe um valor válido (ex.: 189,90).")
      return
    }

    setSaving(true)
    setEditError(null)
    try {
      const res = await fetch(`/api/planos/${editPlano.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ valor }),
      })
      const data = (await res.json()) as { error?: string; valor?: number }
      if (!res.ok) {
        throw new Error(data.error ?? "Não foi possível salvar o valor.")
      }

      const novoValor = data.valor ?? valor
      setPlanos((prev) =>
        prev.map((p) => (p.id === editPlano.id ? { ...p, valor: novoValor } : p)),
      )
      toast.success(`Valor do plano ${editPlano.nome} atualizado.`)
      setEditOpen(false)
      setEditPlano(null)
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Erro ao salvar.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <Navbar title="Planos" subtitle="Gestão de planos da academia" action={{ label: "Novo Plano" }} />

      <div className="p-6 space-y-6">
        {loadError && (
          <p className="text-sm text-destructive" role="alert">
            {loadError}
          </p>
        )}

        {/* Resumo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {loading && planos.length === 0 ? (
            <p className="text-sm text-muted-foreground col-span-full">A carregar planos…</p>
          ) : (
            planos.map((p) => {
              const Icon = p.icon
              return (
                <div key={p.id} className="metric-card rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold" style={{ color: p.color }}>
                      {p.nome}
                    </span>
                    <Icon className="w-4 h-4" style={{ color: p.color }} />
                  </div>
                  <p className="text-xl font-bold" style={{ fontFamily: "var(--font-space-grotesk)" }}>
                    {p.alunos}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    <Users className="w-3 h-3" /> alunos ativos
                  </p>
                </div>
              )
            })
          )}
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
                    <span
                      className="text-xs font-bold px-2.5 py-1 rounded-full"
                      style={{ background: "var(--neon-dim)", color: "var(--neon)" }}
                    >
                      Mais Popular
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-3 mb-5">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{ background: `${plano.color}20` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: plano.color }} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg" style={{ fontFamily: "var(--font-space-grotesk)" }}>
                      {plano.nome}
                    </h3>
                    <p className="text-xs text-muted-foreground">{plano.descricaoUi}</p>
                  </div>
                </div>

                <div className="mb-5">
                  <div className="flex items-baseline gap-1">
                    <span
                      className="text-3xl font-bold"
                      style={{ fontFamily: "var(--font-space-grotesk)", color: plano.color }}
                    >
                      R$ {formatValorBR(plano.valor)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{plano.duracao}</p>
                </div>

                <ul className="space-y-2.5 flex-1 mb-6">
                  {plano.features.map((feat, i) => (
                    <li key={i} className="flex items-center gap-2.5 text-sm">
                      <div
                        className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: `${plano.color}20` }}
                      >
                        <Check className="w-2.5 h-2.5" style={{ color: plano.color }} />
                      </div>
                      <span className="text-muted-foreground">{feat}</span>
                    </li>
                  ))}
                </ul>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-2 border-border/50"
                    onClick={() => openEdit(plano)}
                  >
                    <Edit className="w-3.5 h-3.5" /> Editar valor
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="w-9 h-9 text-muted-foreground hover:text-destructive"
                    disabled
                    title="Em breve"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open)
          if (!open) {
            setEditPlano(null)
            setEditError(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <form onSubmit={(e) => void handleSaveValor(e)}>
            <DialogHeader>
              <DialogTitle>Editar valor do plano</DialogTitle>
              <DialogDescription>
                {editPlano
                  ? `Altere o preço mensal do plano ${editPlano.nome}. O valor fica guardado para a sua academia.`
                  : "Defina o novo valor mensal."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {editError && (
                <p className="text-sm text-destructive" role="alert">
                  {editError}
                </p>
              )}
              <div className="grid gap-2">
                <Label htmlFor="plano-valor">Valor mensal (R$)</Label>
                <Input
                  id="plano-valor"
                  inputMode="decimal"
                  placeholder="189,90"
                  value={editValor}
                  onChange={(e) => {
                    setEditValor(e.target.value)
                    if (editError) setEditError(null)
                  }}
                  autoFocus
                  className="bg-secondary border-border/50"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saving}
                style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
              >
                {saving ? "Salvando…" : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
