import { cn } from "@/lib/utils"

export function PremiumBadge({
  variant = "premium",
  className,
}: {
  variant?: "premium" | "free"
  className?: string
}) {
  const isPremium = variant === "premium"
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        isPremium
          ? "bg-primary/20 text-primary border border-primary/30"
          : "bg-secondary text-muted-foreground border border-border/50",
        className,
      )}
    >
      {isPremium ? "Premium" : "Free"}
    </span>
  )
}
