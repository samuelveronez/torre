import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

type StatCardProps = {
  label: string
  value: ReactNode
  hint?: ReactNode
  tone?: "default" | "danger" | "brand"
  className?: string
}

const toneClass = {
  default: "text-foreground",
  danger: "text-destructive",
  brand: "text-primary",
}

export function StatCard({ label, value, hint, tone = "default", className }: StatCardProps) {
  return (
    <div className={cn("rounded-lg border border-border bg-card p-4 text-card-foreground", className)}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-2xl font-semibold", toneClass[tone])}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
