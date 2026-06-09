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
  Shield,
} from "lucide-react"
import type { UserRole } from "@/lib/auth/roles"
import { isAlunoRole, isStaffRole, isUsuarioRole } from "@/lib/auth/roles"
import { isMasterEmail } from "@/lib/auth/master"
import { isNutricaoOnlyPlan } from "@/lib/premium/plan-access"

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

const usuarioNutricaoNav: NavGroup[] = [
  {
    label: "Nutrição",
    items: [
      { href: "/dietas", label: "Nutrição", icon: Salad },
      { href: "/perfil", label: "Perfil", icon: UserCircle },
      { href: "/minha-assinatura", label: "Minha assinatura", icon: CreditCard },
      { href: "/premium", label: "Upgrade", icon: Sparkles },
    ],
  },
]

const masterNav: NavGroup = {
  label: "Plataforma",
  items: [{ href: "/master", label: "Master", icon: Shield }],
}

export function navGroupsForRole(
  role: UserRole | null | undefined,
  email?: string | null,
  planType?: string | null,
): NavGroup[] {
  if (!role || isStaffRole(role)) {
    const groups = [...staffNav]
    if (isMasterEmail(email)) groups.push(masterNav)
    return groups
  }
  if (isUsuarioRole(role)) {
    return isNutricaoOnlyPlan(planType) ? usuarioNutricaoNav : usuarioNav
  }
  if (isAlunoRole(role)) return alunoNav
  return alunoNav
}

export function showConfiguracoesLink(role: UserRole | null | undefined): boolean {
  return isStaffRole(role ?? "aluno")
}

export function sidebarBrandSubtitle(
  role: UserRole | null | undefined,
  planType?: string | null,
): string {
  if (isStaffRole(role ?? "aluno")) return "Academia Pro"
  if (isUsuarioRole(role ?? "aluno")) {
    return isNutricaoOnlyPlan(planType) ? "Nutrição" : "Fitness"
  }
  return "Aluno"
}
