"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/layout/navbar"
import { Button } from "@/components/ui/button"
import { Building2, LogOut, Mail, Shield } from "lucide-react"

export type ConfiguracoesUser = {
  id: number
  displayName: string
  emailMasked: string
  roleLabel: string
  academiaId: number
}

export function ConfiguracoesClient({ initialUser }: { initialUser: ConfiguracoesUser }) {
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" })
    } finally {
      router.replace("/login")
    }
  }

  return (
    <div>
      <Navbar title="Configurações" subtitle="Conta, academia e sessão" />

      <div className="p-6 space-y-6 max-w-2xl">
        <div className="metric-card rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            <Mail className="w-4 h-4" />
            Conta
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Nome</p>
            <p className="font-medium">{initialUser.displayName}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">E-mail de acesso</p>
            <p className="font-medium font-mono text-sm">{initialUser.emailMasked}</p>
            <p className="text-xs text-muted-foreground mt-1">
              O endereço completo não é exibido em menus públicos por segurança.
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Função</p>
            <p className="font-medium flex items-center gap-2">
              <Shield className="w-4 h-4 text-muted-foreground" />
              {initialUser.roleLabel}
            </p>
          </div>
        </div>

        <div className="metric-card rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            <Building2 className="w-4 h-4" />
            Academia
          </div>
          <div>
            <p className="text-xs text-muted-foreground">ID da academia (tenant)</p>
            <p className="font-mono text-sm">{String(initialUser.academiaId)}</p>
          </div>
        </div>

        <div className="metric-card rounded-xl p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
            <LogOut className="w-4 h-4" />
            Sessão
          </div>
          <Button
            variant="outline"
            className="border-destructive/40 text-destructive hover:bg-destructive/10"
            disabled={loggingOut}
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            {loggingOut ? "Saindo…" : "Sair da conta"}
          </Button>
        </div>
      </div>
    </div>
  )
}
