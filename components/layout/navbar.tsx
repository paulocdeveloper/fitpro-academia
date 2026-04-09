"use client"

import Link from "next/link"
import { Bell, Search, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface NavbarProps {
  title: string
  subtitle?: string
  action?: { label: string; href?: string; onClick?: () => void }
}

export function Navbar({ title, subtitle, action }: NavbarProps) {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-border/50" style={{ background: "var(--background)" }}>
      <div>
        <h1 className="text-xl font-bold tracking-tight" style={{ fontFamily: "var(--font-space-grotesk)" }}>
          {title}
        </h1>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            className="pl-9 w-56 h-9 bg-secondary border-border/50 text-sm focus:border-primary/50"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="relative w-9 h-9 border-border/50">
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold" style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}>3</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <div className="px-3 py-2 border-b border-border">
              <p className="font-semibold text-sm">Notificações</p>
            </div>
            {[
              { msg: "Carlos Silva completou o treino de hoje", time: "2min" },
              { msg: "Pagamento de Ana Lima vencendo amanhã", time: "1h" },
              { msg: "3 novos alunos cadastrados", time: "3h" },
            ].map((n, i) => (
              <DropdownMenuItem key={i} className="flex flex-col items-start gap-1 py-3">
                <span className="text-sm">{n.msg}</span>
                <span className="text-xs text-muted-foreground">{n.time} atrás</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {action &&
          (action.href ? (
            <Button
              size="sm"
              className="gap-2 font-semibold"
              style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
              asChild
            >
              <Link href={action.href} className="inline-flex items-center gap-2">
                <Plus className="w-4 h-4" />
                {action.label}
              </Link>
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              className="gap-2 font-semibold"
              style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
              onClick={action.onClick}
            >
              <Plus className="w-4 h-4" />
              {action.label}
            </Button>
          ))}
      </div>
    </header>
  )
}
