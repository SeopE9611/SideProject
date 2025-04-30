"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Tailwind CSS 4 호환 버튼 스타일 - 명시적 클래스 사용
const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-[#3b82f6] text-[#ffffff] hover:bg-opacity-90 dark:bg-[#3b82f6] dark:text-[#0f172a]",
        destructive: "bg-[#ef4444] text-[#ffffff] hover:bg-opacity-90 dark:bg-[#b91c1c] dark:text-[#f8fafc]",
        outline:
          "border border-[#e2e8f0] bg-[#ffffff] hover:bg-[#f1f5f9] hover:text-[#1e293b] dark:border-[#1e293b] dark:bg-[#0f172a] dark:hover:bg-[#1e293b] dark:text-[#f8fafc]",
        secondary: "bg-[#f1f5f9] text-[#1e293b] hover:bg-opacity-80 dark:bg-[#1e293b] dark:text-[#f8fafc]",
        ghost: "hover:bg-[#f1f5f9] hover:text-[#1e293b] dark:hover:bg-[#1e293b] dark:hover:text-[#f8fafc]",
        link: "text-[#3b82f6] underline-offset-4 hover:underline dark:text-[#3b82f6]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }
