import { cn } from "@/lib/utils"
import type { SubscriptionStatus } from "@/lib/premium/types"

export function PremiumBadge({
  variant = "premium",
  className,
}: {
  variant?: "premium" | "free" | SubscriptionStatus
  className?: string
}) {
  const label =
    variant === "premium"
      ? "Premium"
      : variant === "expired"
        ? "Expirado"
        : variant === "cancelled"
          ? "Cancelado"
          : "Free"

  const isPremium = variant === "premium"
  const isExpired = variant === "expired" || variant === "cancelled"

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        isPremium
          ? "bg-primary/20 text-primary border border-primary/30"
          : isExpired
            ? "bg-destructive/15 text-destructive border border-destructive/25"
            : "bg-secondary text-muted-foreground border border-border/50",
        className,
      )}
    >
      {label}
    </span>
  )
}
