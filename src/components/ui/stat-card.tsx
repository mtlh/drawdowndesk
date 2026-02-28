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
    <div className={`flex items-center gap-2 border rounded-md px-4 py-2.5 min-w-[120px] bg-gradient-to-br to-transparent border ${className}`}>
      <span className="text-lg">{icon}</span>
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={`text-xl font-bold ${valueColor}`}>{value}</div>
        {subValue && (
          <div className={`text-xs ${subValueColor}`}>{subValue}</div>
        )}
      </div>
    </div>
  )
}
