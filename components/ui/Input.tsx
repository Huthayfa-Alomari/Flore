import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-2xl border border-flore-border bg-flore-card px-4 py-3 text-sm text-flore-text-primary transition-all duration-200 ease-flore file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-flore-text-secondary/50 hover:border-flore-sage focus-visible:outline-none focus-visible:border-flore-primary/50 focus-visible:ring-4 focus-visible:ring-flore-primary/10 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }