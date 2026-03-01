import { ReactNode } from "react"

interface StatCardProps {
  icon?: ReactNode
  label: string
  value: string
  subValue?: string
  valueColor?: string
  subValueColor?: string
  className?: string
  compact?: boolean
}

export function StatCard({
  icon,
  label,
  value,
  subValue,
  valueColor = "",
  subValueColor = "",
  className = "",
  compact = false
}: StatCardProps) {
  if (compact) {
    return (
      <div className={`flex items-center gap-2 border rounded-md px-3 py-2 bg-gradient-to-br to-transparent ${className}`}>
        {icon && <span className="text-lg">{icon}</span>}
        <div className="flex-1 min-w-0">
          <div className="text-xs text-muted-foreground truncate">{label}</div>
          <div className={`text-lg font-bold truncate ${valueColor}`}>{value}</div>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-3 border rounded-lg px-4 py-3 bg-gradient-to-br to-transparent ${className}`}>
      {icon && <span className="text-2xl">{icon}</span>}
      <div className="flex-1 min-w-0">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className={`text-2xl font-bold truncate ${valueColor}`}>{value}</div>
        {subValue && (
          <div className={`text-sm ${subValueColor}`}>{subValue}</div>
        )}
      </div>
    </div>
  )
}
