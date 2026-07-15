import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-flore-primary focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-flore-primary text-white",
        secondary: "border-transparent bg-flore-subtle text-flore-text-primary",
        gold: "border-transparent bg-flore-gold-dark text-white",
        outline: "border-flore-border text-flore-text-primary",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }