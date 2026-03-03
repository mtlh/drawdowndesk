import { cn } from "@/lib/utils"

interface LoadingSpinnerProps {
  /** Optional message to display below the spinner */
  message?: string
  /** Whether to use full-screen layout */
  fullScreen?: boolean
  /** Additional CSS classes */
  className?: string
  /** Size of the spinner (small, default, large) */
  size?: "sm" | "default" | "lg"
}

const sizeClasses = {
  sm: "h-4 w-4",
  default: "h-8 w-8",
  lg: "h-12 w-12",
}

export function LoadingSpinner({
  message,
  fullScreen = false,
  className,
  size = "default",
}: LoadingSpinnerProps) {
  const spinner = (
    <div role="status" aria-live="polite" aria-busy="true">
      <div
        className={cn(
          "animate-spin rounded-full border-b-2 border-muted-foreground",
          sizeClasses[size],
          className
        )}
        aria-hidden="true"
      />
      {message && (
        <p className={cn("text-muted-foreground", size === "sm" && "text-sm")}>
          {message}
        </p>
      )}
    </div>
  )

  if (fullScreen) {
    return (
      <div className="flex min-h-screen bg-background items-center justify-center">
        <div className="text-center space-y-2">{spinner}</div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center">
      <div className="text-center space-y-2">{spinner}</div>
    </div>
  )
}
