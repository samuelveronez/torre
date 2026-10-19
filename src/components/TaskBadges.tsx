import { Badge } from "@/components/ui/badge"
import { priorities, type Priority } from "@/priority"

const priorityVariant = {
  high: "priorityHigh",
  medium: "priorityMedium",
  low: "priorityLow",
} as const

export function PriorityBadge({ priority }: { priority?: Priority }) {
  if (!priority || priority === "none") return null
  const label = priorities.find((p) => p.value === priority)?.label
  return <Badge variant={priorityVariant[priority]}>{label}</Badge>
}

const areaDot = {
  Profissional: "bg-primary",
  Pessoal: "bg-purple-500",
} as const

export function AreaBadge({ area }: { area: "Pessoal" | "Profissional" }) {
  return (
    <Badge variant="area">
      <span className={`size-2 rounded-full ${areaDot[area]}`} aria-hidden="true" />
      {area}
    </Badge>
  )
}
