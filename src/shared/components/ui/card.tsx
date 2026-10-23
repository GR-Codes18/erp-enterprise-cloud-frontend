import * as React from "react"
import { cn } from "@/shared/lib/utils"

export interface CardProps {
  className?: string
  children?: React.ReactNode
}

export function Card({ className, children,}: CardProps) {
  return (
    <div className={cn("rounded-lg border bg-card p-4 shadow-sm", className)}>{children}</div>
  )
}

export const CardHeader = React.forwardRef(
  (
    { className, children, ...props }: React.HTMLAttributes<HTMLDivElement>,
    ref: React.Ref<HTMLDivElement>
  ) => {
    return (
      <div
        className={cn("flex flex-col space-y-1.5 p-0", className)}
        ref={ref}
        {...props}
      >
        {children}
      </div>
    )
  }
)

export const CardTitle = React.forwardRef(
  (
    { className, children, ...props }: React.HTMLAttributes<HTMLDivElement>,
    ref: React.Ref<HTMLDivElement>
  ) => {
    return (
      <div
        className={cn("text-lg font-semibold leading-none tracking-tight", className)}
        ref={ref}
        {...props}
      >
        {children}
      </div>
    )
  }
)

export const CardDescription = React.forwardRef(
  (
    { className, children, ...props }: React.HTMLAttributes<HTMLDivElement>,
    ref: React.Ref<HTMLDivElement>
  ) => {
    return (
      <div
        className={cn("text-sm text-muted-foreground", className)}
        ref={ref}
        {...props}
      >
        {children}
      </div>
    )
  }
)

export const CardContent = React.forwardRef(
  (
    { className, children, ...props }: React.HTMLAttributes<HTMLDivElement>,
    ref: React.Ref<HTMLDivElement>
  ) => {
    return (
      <div
        className={cn("p-6 pt-0", className)}
        ref={ref}
        {...props}
      >
        {children}
      </div>
    )
  }
)