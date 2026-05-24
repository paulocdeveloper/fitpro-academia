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
  Settings,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { SidebarUser } from "@/components/layout/sidebar-user"

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
    <aside
      className="fixed left-0 top-0 z-30 flex h-full w-64 flex-col md:w-64"
      style={{ background: "var(--sidebar)", borderRight: "1px solid var(--sidebar-border)" }}
    >
      <div className="flex items-center gap-3 border-b border-border/50 px-5 py-5">
        <div
          className="neon-glow flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ background: "var(--primary)" }}
        >
          <Zap className="h-4 w-4" style={{ color: "var(--primary-foreground)" }} />
        </div>
        <div>
          <span className="text-base font-bold tracking-tight" style={{ fontFamily: "var(--font-space-grotesk)" }}>
            FitPro
          </span>
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            Academia Pro
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {navItems.map((group) => (
          <div key={group.label}>
            <p
              className="mb-2 px-3 text-xs font-semibold uppercase tracking-widest"
              style={{ color: "var(--muted-foreground)" }}
            >
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href))
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
                        "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                        isActive
                          ? "sidebar-item-active"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      {badgeText !== null && (
                        <span
                          className="rounded-full px-1.5 py-0.5 text-xs"
                          style={{
                            background: "var(--primary)",
                            color: "var(--primary-foreground)",
                            fontSize: "10px",
                          }}
                        >
                          {badgeText}
                        </span>
                      )}
                      {isActive && <ChevronRight className="h-3 w-3 opacity-60" />}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="space-y-1 border-t border-border/50 p-3">
        <Link
          href="/configuracoes"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
            pathname === "/configuracoes"
              ? "sidebar-item-active"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground",
          )}
        >
          <Settings className="h-4 w-4" />
          Minha conta
        </Link>
        <SidebarUser />
      </div>
    </aside>
  )
}
