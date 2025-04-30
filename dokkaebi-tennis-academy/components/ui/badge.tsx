import type * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border border-[#e2e8f0] px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#3b82f6] focus:ring-offset-2 dark:border-[#1e293b]",
  {
    variants: {
      variant: {
        default: "border-transparent bg-[#3b82f6] text-[#ffffff]",
        secondary: "border-transparent bg-[#f1f5f9] text-[#1e293b] dark:bg-[#1e293b] dark:text-[#f8fafc]",
        destructive: "border-transparent bg-[#ef4444] text-[#ffffff] dark:bg-[#b91c1c]",
        outline: "text-[#0f172a] dark:text-[#f8fafc]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
