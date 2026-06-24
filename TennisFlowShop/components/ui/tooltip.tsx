"use client";

import { cn } from "@/lib/utils";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import * as React from "react";

// Provider wraps the part of your app that will use tooltips
const TooltipProvider = TooltipPrimitive.Provider;
// Root component for Tooltip
const Tooltip = TooltipPrimitive.Root;
// Trigger element (e.g. icon or text) that shows the tooltip on hover/focus
const TooltipTrigger = TooltipPrimitive.Trigger;

/**
 * TooltipContent: the overlay that displays the tooltip message.
 * Wrapped in Portal so it's rendered outside of the DOM hierarchy
 * (e.g. outside of <tbody>) to avoid invalid HTML nesting.
 */
const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-[60] overflow-hidden rounded-md border border-border bg-popover px-3 py-1.5",
        "text-ui-label text-popover-foreground shadow-md opacity-100 animate-in fade-in-0 zoom-in-95",
        "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
        className,
      )}
      {...props}
    >
      {/* Tooltip message content */}
      {props.children}
      {/* Arrow pointing to the trigger */}
      <TooltipPrimitive.Arrow className="fill-popover" />
    </TooltipPrimitive.Content>
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
