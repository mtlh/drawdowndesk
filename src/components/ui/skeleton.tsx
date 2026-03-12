import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-muted animate-pulse rounded-md", className)}
      {...props}
    />
  )
}

function SkeletonCard({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-xl border bg-card", className)}
      {...props}
    />
  )
}

function SkeletonCardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-col space-y-1.5 p-6", className)}
      {...props}
    />
  )
}

function SkeletonCardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <Skeleton
      className={cn("h-6 w-3/4", className)}
      {...props}
    />
  )
}

function SkeletonCardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("p-6 pt-0", className)}
      {...props}
    />
  )
}

function SkeletonButton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <Skeleton
      className={cn("h-10 w-20 rounded-md", className)}
      {...props}
    />
  )
}

function SkeletonChart({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <Skeleton
      className={cn("h-[400px] w-full rounded-lg", className)}
      {...props}
    />
  )
}

function SkeletonText({ lines = 1, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            "h-4",
            i === lines - 1 && lines > 1 ? "w-3/4" : "w-full"
          )}
        />
      ))}
    </div>
  )
}

function SkeletonList({ count = 5, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  )
}

export { Skeleton, SkeletonCard, SkeletonCardHeader, SkeletonCardTitle, SkeletonCardContent, SkeletonButton, SkeletonChart, SkeletonText, SkeletonList }
