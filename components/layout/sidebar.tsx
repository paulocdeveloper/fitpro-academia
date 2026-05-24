"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect } from "react"
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
  Settings,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { SidebarUser } from "@/components/layout/sidebar-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"

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

function NavLink({
  item,
  isActive,
  badgeText,
}: {
  item: NavItem
  isActive: boolean
  badgeText: string | null
}) {
  const Icon = item.icon

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        tooltip={item.label}
        className={cn(isActive && "sidebar-item-active font-medium")}
      >
        <Link href={item.href}>
          <Icon className="h-4 w-4 shrink-0" />
          <span>{item.label}</span>
        </Link>
      </SidebarMenuButton>
      {badgeText !== null && (
        <SidebarMenuBadge
          className="rounded-full text-[10px]"
          style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
        >
          {badgeText}
        </SidebarMenuBadge>
      )}
    </SidebarMenuItem>
  )
}

export function AppSidebar() {
  const pathname = usePathname()
  const alunosCount = useAlunosCount(pathname)
  const { isMobile, setOpenMobile } = useSidebar()

  useEffect(() => {
    if (isMobile) setOpenMobile(false)
  }, [pathname, isMobile, setOpenMobile])

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50">
      <SidebarHeader className="border-b border-border/50 px-2 py-4">
        <Link href="/dashboard" className="flex items-center gap-3 overflow-hidden px-2">
          <div
            className="neon-glow flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
            style={{ background: "var(--primary)" }}
          >
            <Zap className="h-4 w-4" style={{ color: "var(--primary-foreground)" }} />
          </div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <span
              className="block truncate text-base font-bold tracking-tight"
              style={{ fontFamily: "var(--font-space-grotesk)" }}
            >
              FitPro
            </span>
            <p className="truncate text-xs text-muted-foreground">Academia Pro</p>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-1 py-2">
        {navItems.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="uppercase tracking-widest text-[10px]">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
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
                    <NavLink
                      key={item.href}
                      item={item}
                      isActive={isActive}
                      badgeText={badgeText}
                    />
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-border/50 p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname === "/configuracoes"}
              tooltip="Minha conta"
              className={cn(pathname === "/configuracoes" && "sidebar-item-active")}
            >
              <Link href="/configuracoes">
                <Settings className="h-4 w-4" />
                <span>Minha conta</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
