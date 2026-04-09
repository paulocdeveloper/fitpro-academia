import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown } from "lucide-react"

interface MetricCardProps {
  label: string
  value: string
  change?: string
  positive?: boolean
  icon: LucideIcon
  accent?: string
}

export function MetricCard({ label, value, change, positive = true, icon: Icon, accent }: MetricCardProps) {
  return (
    <div className="metric-card rounded-xl p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: accent ? `${accent}20` : "var(--neon-dim)" }}
        >
          <Icon className="w-4 h-4" style={{ color: accent ?? "var(--neon)" }} />
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-space-grotesk)" }}>
          {value}
        </p>
        {change && (
          <div className={cn("flex items-center gap-1 mt-1 text-xs font-medium", positive ? "text-emerald-400" : "text-red-400")}>
            {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {change} vs. mês anterior
          </div>
        )}
      </div>
    </div>
  )
}
