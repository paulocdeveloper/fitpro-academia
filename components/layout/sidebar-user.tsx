"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useSidebar } from "@/components/ui/sidebar"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useSessionUser } from "@/lib/hooks/use-session-user"
import { isStaffRole, isUsuarioRole } from "@/lib/auth/roles"
import { cn } from "@/lib/utils"

export function SidebarUser() {
  const router = useRouter()
  const { user, loading } = useSessionUser()
  const { state, isMobile } = useSidebar()
  const collapsed = !isMobile && state === "collapsed"

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" })
    } finally {
      router.replace("/login")
      router.refresh()
    }
  }

  if (loading) {
    return (
      <div className={cn("flex items-center gap-3 px-2 py-2 animate-pulse", collapsed && "justify-center")}>
        <div className="h-8 w-8 rounded-full bg-secondary" />
        {!collapsed && (
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-20 rounded bg-secondary" />
            <div className="h-2 w-14 rounded bg-secondary" />
          </div>
        )}
      </div>
    )
  }

  if (!user) {
    return null
  }

  const profile = (
    <Link
      href={
        isStaffRole(user.role)
          ? "/configuracoes"
          : isUsuarioRole(user.role)
            ? "/perfil"
            : "/treino-inteligente"
      }
      className={cn(
        "flex min-w-0 items-center gap-3 rounded-lg px-1 py-1 hover:bg-secondary/80 transition-colors",
        collapsed && "justify-center px-0",
      )}
      title={collapsed ? user.displayName : "Minha conta"}
    >
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback
          style={{
            background: "var(--primary)",
            color: "var(--primary-foreground)",
            fontSize: "11px",
          }}
        >
          {user.initials}
        </AvatarFallback>
      </Avatar>
      {!collapsed && (
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{user.displayName}</p>
          <p className="truncate text-xs text-muted-foreground">{user.roleLabel}</p>
        </div>
      )}
    </Link>
  )

  return (
    <div className={cn("flex items-center gap-1 px-1 py-1", collapsed && "flex-col")}>
      {collapsed ? (
        <Tooltip>
          <TooltipTrigger asChild>{profile}</TooltipTrigger>
          <TooltipContent side="right">{user.displayName}</TooltipContent>
        </Tooltip>
      ) : (
        profile
      )}
      <button
        type="button"
        onClick={handleLogout}
        className={cn(
          "shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
          collapsed && "w-full",
        )}
        aria-label="Sair da conta"
        title="Sair"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  )
}
