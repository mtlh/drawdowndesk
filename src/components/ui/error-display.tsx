import { AlertCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface ErrorDisplayProps {
  /** The error message to display */
  message: string
  /** Optional title for the error */
  title?: string
  /** Whether to use full-screen layout */
  fullScreen?: boolean
  /** Optional retry action */
  onRetry?: () => void
  /** Additional CSS classes */
  className?: string
}

export function ErrorDisplay({
  message,
  title = "Error",
  fullScreen = false,
  onRetry,
  className,
}: ErrorDisplayProps) {
  const errorContent = (
    <div className="flex items-center gap-2 text-destructive" role="alert">
      <AlertCircle className="h-5 w-5" aria-hidden="true" />
      <span>{message}</span>
    </div>
  )

  if (fullScreen) {
    return (
      <div className="flex min-h-screen bg-background items-center justify-center" role="alert">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" aria-hidden="true" />
              {title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{message}</p>
            {onRetry && (
              <Button variant="outline" onClick={onRetry}>
                Try Again
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={className}>
      {errorContent}
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-2">
          Try Again
        </Button>
      )}
    </div>
  )
}
