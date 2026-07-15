import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-ui-body-sm font-medium ring-offset-background transition-[background-color,color,border-color,box-shadow,opacity] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm shadow-black/10 hover:bg-primary/90 active:translate-y-px active:shadow-sm",
        secondary:
          "border border-border bg-card text-foreground shadow-sm hover:bg-secondary active:translate-y-px",
        outline:
          "border border-border bg-card text-foreground shadow-sm hover:bg-secondary active:translate-y-px",
        ghost: "text-foreground hover:bg-secondary active:bg-secondary",
        elevated:
          "border border-border bg-card text-foreground shadow-md shadow-black/5 hover:bg-secondary active:translate-y-px",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        highlight:
          "bg-brand-highlight text-brand-highlight-foreground shadow-sm hover:bg-brand-highlight/90 active:translate-y-px active:bg-brand-highlight/85",
        highlight_soft:
          "border border-brand-highlight-ink/30 bg-brand-highlight-muted text-foreground shadow-none hover:border-brand-highlight-ink/45 hover:bg-brand-highlight-muted/80 active:translate-y-px",
        inverse:
          "border border-surface-inverse-foreground/20 bg-surface-inverse-foreground text-surface-inverse shadow-sm hover:bg-surface-inverse-foreground/90 active:translate-y-px",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-lg px-3",
        lg: "h-11 rounded-xl px-8",
        tall: "h-12 rounded-xl px-6 text-ui-body",
        icon: "h-10 w-10 rounded-lg",
      },
      wrap: {
        nowrap: "whitespace-nowrap",
        normal: "h-auto whitespace-normal break-keep text-center leading-snug",
        responsive:
          "h-auto whitespace-normal break-keep text-center leading-snug sm:whitespace-nowrap sm:leading-normal",
      },
    },
    compoundVariants: [
      { wrap: "normal", size: "default", class: "min-h-10" },
      { wrap: "normal", size: "sm", class: "min-h-9" },
      { wrap: "normal", size: "lg", class: "min-h-11" },
      { wrap: "normal", size: "tall", class: "min-h-12" },
      {
        wrap: "normal",
        size: "icon",
        class: "h-10 min-h-10 whitespace-nowrap leading-normal",
      },
      { wrap: "responsive", size: "default", class: "min-h-10 sm:h-10" },
      { wrap: "responsive", size: "sm", class: "min-h-9 sm:h-9" },
      { wrap: "responsive", size: "lg", class: "min-h-11 sm:h-11" },
      { wrap: "responsive", size: "tall", class: "min-h-12 sm:h-12" },
      {
        wrap: "responsive",
        size: "icon",
        class: "h-10 min-h-10 whitespace-nowrap leading-normal",
      },
    ],
    defaultVariants: {
      variant: "default",
      size: "default",
      wrap: "nowrap",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, wrap, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, wrap, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
