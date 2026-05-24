"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useSessionUser } from "@/lib/hooks/use-session-user"
import { cn } from "@/lib/utils"

export function SidebarUser() {
  const router = useRouter()
  const { user, loading } = useSessionUser()

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
      <div className="flex items-center gap-3 px-3 py-2.5 animate-pulse">
        <div className="w-8 h-8 rounded-full bg-secondary" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 w-20 rounded bg-secondary" />
          <div className="h-2 w-14 rounded bg-secondary" />
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="flex items-center gap-2 px-2 py-2">
      <Link
        href="/configuracoes"
        className={cn(
          "flex flex-1 min-w-0 items-center gap-3 rounded-lg px-1 py-1",
          "hover:bg-secondary/80 transition-colors",
        )}
        title="Minha conta"
      >
        <Avatar className="w-8 h-8 shrink-0">
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
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{user.displayName}</p>
          <p className="text-xs text-muted-foreground truncate">{user.roleLabel}</p>
        </div>
      </Link>
      <button
        type="button"
        onClick={handleLogout}
        className="shrink-0 p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        aria-label="Sair da conta"
        title="Sair"
      >
        <LogOut className="w-4 h-4" />
      </button>
    </div>
  )
}
