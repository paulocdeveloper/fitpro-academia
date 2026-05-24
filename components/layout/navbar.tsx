"use client"

import Link from "next/link"
import { Bell, Search, Plus } from "lucide-react"
import { SidebarToggle } from "@/components/layout/sidebar-toggle"
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
    <header
      className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-border/50 px-3 py-3 sm:px-4 md:px-6 md:py-4"
      style={{ background: "var(--background)" }}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        <SidebarToggle />
        <div className="min-w-0">
          <h1
            className="truncate text-lg font-bold tracking-tight sm:text-xl"
            style={{ fontFamily: "var(--font-space-grotesk)" }}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="truncate text-xs text-muted-foreground sm:text-sm">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
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
              className="gap-1.5 font-semibold sm:gap-2"
              style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
              asChild
            >
              <Link href={action.href} className="inline-flex items-center gap-1.5 sm:gap-2">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">{action.label}</span>
                <span className="sm:hidden">Novo</span>
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
