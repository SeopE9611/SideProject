'use client';

import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '@/lib/utils';

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
const TooltipContent = React.forwardRef<React.ElementRef<typeof TooltipPrimitive.Content>, React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        // 강제 흰색 배경
        'z-50 overflow-hidden rounded-md border !bg-white !bg-opacity-100 px-3 py-1.5 ' +
          'text-sm text-black shadow-md animate-in fade-in-0 zoom-in-95 ' +
          'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 ' +
          'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 ' +
          'data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
        className
      )}
      {...props}
    >
      {/* Tooltip message content */}
      {props.children}
      {/* Arrow pointing to the trigger */}
      <TooltipPrimitive.Arrow className="fill-popover-foreground" />
    </TooltipPrimitive.Content>
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent };
