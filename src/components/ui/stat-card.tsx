import { ReactNode } from "react"

interface StatCardProps {
  icon: ReactNode
  label: string
  value: string
  subValue?: string
  valueColor?: string
  subValueColor?: string
  className?: string
}

export function StatCard({
  icon,
  label,
  value,
  subValue,
  valueColor = "",
  subValueColor = "",
  className = ""
}: StatCardProps) {
  return (
    <div className={`flex items-center gap-3 border rounded-lg px-4 py-3 bg-gradient-to-br to-transparent border ${className}`}>
      <span className="text-xl">{icon}</span>
      <div>
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className={`text-2xl font-bold ${valueColor}`}>{value}</div>
        {subValue && (
          <div className={`text-sm ${subValueColor}`}>{subValue}</div>
        )}
      </div>
    </div>
  )
}
