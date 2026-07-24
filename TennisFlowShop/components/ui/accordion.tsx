"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";

/** tailwind class 합치기 */
function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type AccordionRootProps = {
  type?: "single" | "multiple";
  defaultValue?: string | string[];
  className?: string;
  children: React.ReactNode;
};

type Ctx = {
  type: "single" | "multiple";
  openSet: Set<string>;
  toggle: (id: string) => void;
  getTriggerId: (value: string) => string;
  getContentId: (value: string) => string;
};

const AccordionCtx = React.createContext<Ctx | null>(null);

/** Root */
export function Accordion({
  type = "single",
  defaultValue,
  className,
  children,
}: AccordionRootProps) {
  const rootId = React.useId();
  const initial = new Set<string>(
    Array.isArray(defaultValue) ? defaultValue : defaultValue ? [defaultValue] : [],
  );
  const [openSet, setOpenSet] = React.useState<Set<string>>(initial);

  const toggle = React.useCallback(
    (id: string) => {
      setOpenSet((prev) => {
        const next = new Set(prev);
        if (type === "single") {
          const willOpen = !prev.has(id);
          next.clear();
          if (willOpen) next.add(id);
        } else {
          if (next.has(id)) {
            next.delete(id);
          } else {
            next.add(id);
          }
        }
        return next;
      });
    },
    [type],
  );

  const getTriggerId = React.useCallback((value: string) => `${rootId}-${value}-trigger`, [rootId]);
  const getContentId = React.useCallback((value: string) => `${rootId}-${value}-content`, [rootId]);

  return (
    <div className={className} data-accordion-type={type}>
      <AccordionCtx.Provider value={{ type, openSet, toggle, getTriggerId, getContentId }}>
        {children}
      </AccordionCtx.Provider>
    </div>
  );
}

type ItemProps = {
  value: string;
  className?: string;
  children: React.ReactNode;
};
export function AccordionItem({ value, className, children }: ItemProps) {
  return (
    <div className={cn("border-b border-border", className)} data-acc-item={value}>
      {children}
    </div>
  );
}

type TriggerProps = {
  value: string;
  className?: string;
  children: React.ReactNode;
};
export function AccordionTrigger({ value, className, children }: TriggerProps) {
  const ctx = React.useContext(AccordionCtx)!;
  const open = ctx.openSet.has(value);
  const triggerId = ctx.getTriggerId(value);
  const contentId = ctx.getContentId(value);

  return (
    <button
      id={triggerId}
      type="button"
      aria-expanded={open}
      aria-controls={contentId}
      onClick={() => ctx.toggle(value)}
      data-state={open ? "open" : "closed"}
      className={cn(
        "flex w-full items-center justify-between py-3 text-left text-ui-body-sm",
        "focus-visible:ring-2 ring-ring rounded-lg",
        className,
      )}
    >
      <span>{children}</span>
      <ChevronDown
        className={cn(
          "h-4 w-4 transition-transform duration-200 motion-reduce:transition-none",
          open && "rotate-180",
        )}
      />
    </button>
  );
}

type ContentProps = {
  value: string;
  motion?: "default" | "navigation";
  className?: string;
  children: React.ReactNode;
};
export function AccordionContent({ value, motion = "default", className, children }: ContentProps) {
  const ctx = React.useContext(AccordionCtx)!;
  const open = ctx.openSet.has(value);
  const triggerId = ctx.getTriggerId(value);
  const contentId = ctx.getContentId(value);

  return (
    <div
      id={contentId}
      role="region"
      aria-labelledby={triggerId}
      aria-hidden={open ? "false" : "true"}
      data-state={open ? "open" : "closed"}
      className={cn(
        motion === "navigation"
          ? "grid overflow-hidden transition-[grid-template-rows] duration-[240ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
          : "grid overflow-hidden transition-all duration-200 ease-out",
        motion === "navigation"
          ? open
            ? "grid-rows-[1fr]"
            : "grid-rows-[0fr] pointer-events-none"
          : open
            ? "grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0 pointer-events-none",
      )}
    >
      <div className={cn("min-h-0", className)}>{children}</div>
    </div>
  );
}
