"use client"

import { ChevronLeft, ChevronRight, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSidebar } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

type SidebarToggleProps = {
  className?: string
}

export function SidebarToggle({ className }: SidebarToggleProps) {
  const { toggleSidebar, open, isMobile } = useSidebar()

  if (isMobile) {
    return (
      <Button
        type="button"
        variant="outline"
        size="icon"
        className={cn("h-9 w-9 shrink-0 border-border/50 md:hidden", className)}
        onClick={toggleSidebar}
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </Button>
    )
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className={cn("hidden h-9 w-9 shrink-0 border-border/50 md:inline-flex", className)}
      onClick={toggleSidebar}
      aria-label={open ? "Recolher menu" : "Expandir menu"}
    >
      {open ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
    </Button>
  )
}
