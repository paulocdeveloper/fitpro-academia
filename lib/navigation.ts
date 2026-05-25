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
  Sparkles,
} from "lucide-react"
import type { UserRole } from "@/lib/auth/roles"
import { isStaffRole } from "@/lib/auth/roles"

export type NavItem = {
  href: string
  label: string
  icon: LucideIcon
  badge?: string
}

export type NavGroup = {
  label: string
  items: NavItem[]
}

const staffNav: NavGroup[] = [
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

const alunoNav: NavGroup[] = [
  {
    label: "Meu treino",
    items: [
      { href: "/treino-inteligente", label: "Treino Inteligente", icon: Sparkles },
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
]

export function navGroupsForRole(role: UserRole | null | undefined): NavGroup[] {
  if (!role || isStaffRole(role)) return staffNav
  return alunoNav
}

export function showConfiguracoesLink(role: UserRole | null | undefined): boolean {
  return isStaffRole(role ?? "aluno")
}
