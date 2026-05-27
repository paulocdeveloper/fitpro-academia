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
  TrendingUp,
  UserCircle,
  MessageCircle,
} from "lucide-react"
import type { UserRole } from "@/lib/auth/roles"
import { isAlunoRole, isStaffRole, isUsuarioRole } from "@/lib/auth/roles"

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
      { href: "/coach-ia", label: "Coach IA", icon: MessageCircle },
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
      { href: "/coach-ia", label: "Coach IA", icon: MessageCircle },
      { href: "/agenda", label: "Agenda", icon: CalendarDays },
    ],
  },
]

const usuarioNav: NavGroup[] = [
  {
    label: "Fitness",
    items: [
      { href: "/exercicios", label: "Exercícios", icon: BookOpen },
      { href: "/dietas", label: "Nutrição", icon: Salad, badge: "Premium" },
      { href: "/coach-ia", label: "Coach IA", icon: MessageCircle, badge: "Premium" },
      { href: "/treino-inteligente", label: "IA Treino", icon: Sparkles },
      { href: "/evolucao", label: "Evolução", icon: TrendingUp },
      { href: "/perfil", label: "Perfil", icon: UserCircle },
      { href: "/minha-assinatura", label: "Minha assinatura", icon: CreditCard },
    ],
  },
]

export function navGroupsForRole(role: UserRole | null | undefined): NavGroup[] {
  if (!role || isStaffRole(role)) return staffNav
  if (isUsuarioRole(role)) return usuarioNav
  if (isAlunoRole(role)) return alunoNav
  return alunoNav
}

export function showConfiguracoesLink(role: UserRole | null | undefined): boolean {
  return isStaffRole(role ?? "aluno")
}

export function sidebarBrandSubtitle(role: UserRole | null | undefined): string {
  if (isStaffRole(role ?? "aluno")) return "Academia Pro"
  if (isUsuarioRole(role ?? "aluno")) return "Fitness"
  return "Aluno"
}
