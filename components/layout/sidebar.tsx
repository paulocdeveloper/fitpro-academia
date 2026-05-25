"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect } from "react"
import { useAlunosCount } from "@/lib/hooks/use-alunos-count"
import { useIsStaff } from "@/lib/hooks/use-is-staff"
import { defaultHomeForRole } from "@/lib/auth/route-access"
import {
  navGroupsForRole,
  showConfiguracoesLink,
  sidebarBrandSubtitle,
  type NavItem,
} from "@/lib/navigation"
import { Zap, Settings } from "lucide-react"
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
import { cn } from "@/lib/utils"

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
  const { user, loading, isStaff } = useIsStaff()
  const { isMobile, setOpenMobile } = useSidebar()
  const navItems = navGroupsForRole(user?.role)
  const homeHref = user ? defaultHomeForRole(user.role) : "/login"
  const showConfig = showConfiguracoesLink(user?.role)
  const brandSub = sidebarBrandSubtitle(user?.role)

  useEffect(() => {
    if (isMobile) setOpenMobile(false)
  }, [pathname, isMobile, setOpenMobile])

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50">
      <SidebarHeader className="border-b border-border/50 px-2 py-4">
        <Link href={homeHref} className="flex items-center gap-3 overflow-hidden px-2">
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
            <p className="truncate text-xs text-muted-foreground">{brandSub}</p>
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
        {showConfig && (
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
        )}
        <SidebarUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
