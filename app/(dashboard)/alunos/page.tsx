"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/layout/navbar"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Search, Filter, MoreVertical, Eye, Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react"
import { ALUNOS_CHANGED_EVENT } from "@/lib/hooks/use-alunos-count"

type Aluno = {
  id: number
  nome: string
  email: string | null
  telefone: string | null
  objetivo: string | null
  plano: string | null
  status: "ativo" | "inativo" | "pendente" | null
  peso: number | null
  altura: number | null
}

const statusMap: Record<string, { label: string; class: string }> = {
  ativo: { label: "Ativo", class: "status-pago" },
  inativo: { label: "Inativo", class: "status-atrasado" },
  pendente: { label: "Pendente", class: "status-pendente" },
}

const planoColors: Record<string, string> = {
  Básico: "oklch(0.55 0.01 260)",
  Premium: "oklch(0.7 0.22 145)",
  VIP: "oklch(0.75 0.18 80)",
}

const ROW_ACTION_DELAY_MS = 280

export default function AlunosPage() {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("todos")
  const [alunos, setAlunos] = useState<Aluno[]>([])
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)
  const rowClickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (rowClickTimerRef.current) clearTimeout(rowClickTimerRef.current)
    }
  }, [])

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/alunos", { credentials: "include" })
        if (res.status === 401) {
          window.location.href = "/login"
          return
        }
        if (!res.ok) throw new Error("Erro ao carregar alunos")
        const data: Aluno[] = await res.json()
        setAlunos(data)
      } catch (e) {
        console.error(e)
      }
    }
    load()
  }, [])

  const filtered = alunos.filter(a => {
    const matchSearch = a.nome.toLowerCase().includes(search.toLowerCase()) ||
      (a.email ?? "").toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === "todos" || a.status === statusFilter
    return matchSearch && matchStatus
  })

  function handleRowClick(alunoId: number) {
    if (rowClickTimerRef.current) {
      clearTimeout(rowClickTimerRef.current)
      rowClickTimerRef.current = null
      return
    }
    rowClickTimerRef.current = setTimeout(() => {
      setOpenMenuId(alunoId)
      rowClickTimerRef.current = null
    }, ROW_ACTION_DELAY_MS)
  }

  function handleRowDoubleClick(alunoId: number) {
    if (rowClickTimerRef.current) {
      clearTimeout(rowClickTimerRef.current)
      rowClickTimerRef.current = null
    }
    setOpenMenuId(null)
    router.push(`/alunos/${alunoId}`)
  }

  async function deleteAluno(id: number) {
    if (!confirm("Tem certeza que deseja excluir este aluno? Esta ação não pode ser desfeita.")) return
    try {
      const res = await fetch(`/api/alunos/${id}`, { method: "DELETE", credentials: "include" })
      if (!res.ok) throw new Error("Falha na API")
      setAlunos((prev) => prev.filter((a) => a.id !== id))
      setOpenMenuId(null)
      window.dispatchEvent(new Event(ALUNOS_CHANGED_EVENT))
    } catch {
      alert("Não foi possível excluir o aluno.")
    }
  }

  return (
    <div>
      <Navbar title="Alunos" subtitle="Gestão completa de alunos" action={{ label: "Novo Aluno", href: "/alunos/novo" }} />

      <div className="p-6 space-y-5">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou e-mail..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-secondary border-border/50"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-44 bg-secondary border-border/50">
              <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="ativo">Ativos</SelectItem>
              <SelectItem value="inativo">Inativos</SelectItem>
              <SelectItem value="pendente">Pendentes</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total", value: alunos.length, color: "var(--foreground)" },
            { label: "Ativos", value: alunos.filter(a => a.status === "ativo").length, color: "oklch(0.7 0.22 145)" },
            { label: "Inativos", value: alunos.filter(a => a.status && a.status !== "ativo").length, color: "oklch(0.6 0.2 30)" },
          ].map(s => (
            <div key={s.label} className="metric-card rounded-xl p-4 flex items-center gap-3">
              <span className="text-2xl font-bold" style={{ color: s.color, fontFamily: "var(--font-space-grotesk)" }}>{s.value}</span>
              <span className="text-sm text-muted-foreground">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="metric-card rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Aluno", "Contato", "Objetivo", "Plano", "Status", "Ações"].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3.5">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((aluno, i) => (
                <tr
                  key={aluno.id}
                  onClick={() => handleRowClick(aluno.id)}
                  onDoubleClick={() => handleRowDoubleClick(aluno.id)}
                  className="transition-colors duration-200 ease-out cursor-pointer hover:bg-secondary/45 active:bg-secondary/55"
                  style={{ borderBottom: i < filtered.length - 1 ? "1px solid var(--border)" : "none" }}
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-9 h-9 flex-shrink-0">
                        <AvatarFallback style={{ background: `oklch(${0.5 + (aluno.id % 5) * 0.06} 0.18 ${145 + aluno.id * 30})`, color: "white", fontSize: "11px" }}>
                          {aluno.nome.split(" ").map(n => n[0]).join("").slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{aluno.nome}</p>
                        {aluno.peso != null && aluno.altura != null && (
                          <p className="text-xs text-muted-foreground">
                            {aluno.peso}kg · {aluno.altura}cm
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-muted-foreground truncate max-w-[160px]">{aluno.email}</p>
                    <p className="text-xs text-muted-foreground">{aluno.telefone}</p>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">{aluno.objetivo}</td>
                  <td className="px-5 py-4">
                    {aluno.plano && (
                      <span
                        className="text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={{ color: planoColors[aluno.plano], background: `${planoColors[aluno.plano]}20` }}
                      >
                        {aluno.plano}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {aluno.status && (
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusMap[aluno.status].class}`}>
                        {statusMap[aluno.status].label}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu
                      open={openMenuId === aluno.id}
                      onOpenChange={(open) => setOpenMenuId(open ? aluno.id : null)}
                    >
                      <div className="flex items-center justify-end gap-0.5">
                        <Link href={`/alunos/${aluno.id}`} className="touch-manipulation">
                          <Button variant="ghost" size="icon" className="w-9 h-9 sm:w-8 sm:h-8 text-muted-foreground hover:text-primary" aria-label="Visualizar aluno">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Link href={`/alunos/${aluno.id}?edit=1`} className="touch-manipulation">
                          <Button variant="ghost" size="icon" className="w-9 h-9 sm:w-8 sm:h-8 text-muted-foreground hover:text-foreground" aria-label="Editar aluno">
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-9 h-9 sm:w-8 sm:h-8 text-muted-foreground hover:text-destructive touch-manipulation"
                          aria-label="Excluir aluno"
                          onClick={() => void deleteAluno(aluno.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="w-9 h-9 sm:w-8 sm:h-8 text-muted-foreground touch-manipulation" aria-label="Mais ações">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                      </div>
                      <DropdownMenuContent
                        align="end"
                        sideOffset={6}
                        className="w-48 duration-200 ease-out"
                      >
                        <DropdownMenuItem
                          className="gap-2 cursor-pointer"
                          onSelect={() => router.push(`/alunos/${aluno.id}`)}
                        >
                          <Eye className="w-4 h-4" />
                          Visualizar aluno
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="gap-2 cursor-pointer"
                          onSelect={() => router.push(`/alunos/${aluno.id}?edit=1`)}
                        >
                          <Pencil className="w-4 h-4" />
                          Editar aluno
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          className="gap-2 cursor-pointer"
                          onSelect={() => {
                            void deleteAluno(aluno.id)
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                          Excluir aluno
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex items-center justify-between px-5 py-3.5" style={{ borderTop: "1px solid var(--border)" }}>
            <p className="text-xs text-muted-foreground">Mostrando {filtered.length} de {alunos.length} alunos</p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="w-8 h-8 border-border/50">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" className="w-8 h-8 border-primary/50" style={{ background: "var(--neon-dim)", color: "var(--primary)" }}>
                1
              </Button>
              <Button variant="outline" size="icon" className="w-8 h-8 border-border/50">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
