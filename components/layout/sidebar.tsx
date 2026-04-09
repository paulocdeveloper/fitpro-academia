"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAlunosCount } from "@/lib/hooks/use-alunos-count"
import type { LucideIcon } from "lucide-react"
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  BookOpen,
  Salad,
  CalendarDays,
  CreditCard,
  BarChart3,
  Package,
  Zap,
  ChevronRight,
  LogOut,
  Settings,
  Bell,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

type NavItem = {
  href: string
  label: string
  icon: LucideIcon
  badge?: string
}

const navItems: { label: string; items: NavItem[] }[] = [
  {
    label: "Principal",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/alunos", label: "Alunos", icon: Users },
      { href: "/treinos", label: "Treinos", icon: Dumbbell },
      { href: "/exercicios", label: "Exercícios", icon: BookOpen },
    ],
  },
  {
    label: "Saúde",
    items: [
      { href: "/dietas", label: "Nutrição", icon: Salad },
      { href: "/agenda", label: "Agenda", icon: CalendarDays },
    ],
  },
  {
    label: "Gestão",
    items: [
      { href: "/financeiro", label: "Financeiro", icon: CreditCard },
      { href: "/planos", label: "Planos", icon: BarChart3 },
      { href: "/estoque", label: "Estoque", icon: Package },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const alunosCount = useAlunosCount(pathname)

  return (
    <aside className="fixed left-0 top-0 h-full w-64 flex flex-col z-30" style={{ background: "var(--sidebar)", borderRight: "1px solid var(--sidebar-border)" }}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-border/50">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center neon-glow" style={{ background: "var(--primary)" }}>
          <Zap className="w-4 h-4" style={{ color: "var(--primary-foreground)" }} />
        </div>
        <div>
          <span className="font-bold text-base tracking-tight" style={{ fontFamily: "var(--font-space-grotesk)" }}>
            FitPro
          </span>
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>Academia Pro</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {navItems.map((group) => (
          <div key={group.label}>
            <p className="text-xs font-semibold uppercase tracking-widest px-3 mb-2" style={{ color: "var(--muted-foreground)" }}>
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
                const isAlunos = item.href === "/alunos"
                const badgeText = isAlunos
                  ? alunosCount !== null
                    ? String(alunosCount)
                    : null
                  : (item.badge ?? null)
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group",
                        isActive
                          ? "sidebar-item-active"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                      )}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      {badgeText !== null && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "var(--primary)", color: "var(--primary-foreground)", fontSize: "10px" }}>
                          {badgeText}
                        </span>
                      )}
                      {isActive && <ChevronRight className="w-3 h-3 opacity-60" />}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border/50 space-y-1">
        <Link
          href="/configuracoes"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
            pathname === "/configuracoes"
              ? "sidebar-item-active"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary"
          )}
        >
          <Settings className="w-4 h-4" />
          Configurações
        </Link>
        <div className="flex items-center gap-3 px-3 py-2.5">
          <Avatar className="w-8 h-8">
            <AvatarImage src="/placeholder-avatar.jpg" />
            <AvatarFallback style={{ background: "var(--primary)", color: "var(--primary-foreground)", fontSize: "11px" }}>AD</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">Admin</p>
            <p className="text-xs text-muted-foreground truncate">admin@fitpro.com</p>
          </div>
          <button className="text-muted-foreground hover:text-foreground transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
