"use client"

import { AppSidebar } from "@/components/layout/sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

type DashboardShellProps = {
  children: React.ReactNode
  defaultOpen?: boolean
}

export function DashboardShell({ children, defaultOpen = true }: DashboardShellProps) {
  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar />
      <SidebarInset className="min-h-svh min-w-0 overflow-x-hidden">
        <div className="flex min-h-svh min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
