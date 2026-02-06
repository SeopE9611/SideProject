'use client';

import * as React from 'react';
import { ChevronDown } from 'lucide-react';

/** tailwind class 합치기 */
function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

type AccordionRootProps = {
  type?: 'single' | 'multiple';
  defaultValue?: string | string[];
  className?: string;
  children: React.ReactNode;
};

type Ctx = {
  type: 'single' | 'multiple';
  openSet: Set<string>;
  toggle: (id: string) => void;
};

const AccordionCtx = React.createContext<Ctx | null>(null);

/** Root */
export function Accordion({ type = 'single', defaultValue, className, children }: AccordionRootProps) {
  const initial = new Set<string>(Array.isArray(defaultValue) ? defaultValue : defaultValue ? [defaultValue] : []);
  const [openSet, setOpenSet] = React.useState<Set<string>>(initial);

  const toggle = React.useCallback(
    (id: string) => {
      setOpenSet((prev) => {
        const next = new Set(prev);
        if (type === 'single') {
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
    [type]
  );

  return (
    <div className={className} data-accordion-type={type}>
      <AccordionCtx.Provider value={{ type, openSet, toggle }}>{children}</AccordionCtx.Provider>
    </div>
  );
}

type ItemProps = { value: string; className?: string; children: React.ReactNode };
export function AccordionItem({ value, className, children }: ItemProps) {
  return (
    <div className={cn('border-b border-slate-200 dark:border-slate-700', className)} data-acc-item={value}>
      {children}
    </div>
  );
}

type TriggerProps = { value: string; className?: string; children: React.ReactNode };
export function AccordionTrigger({ value, className, children }: TriggerProps) {
  const ctx = React.useContext(AccordionCtx)!;
  const open = ctx.openSet.has(value);
  return (
    <button type="button" onClick={() => ctx.toggle(value)} className={cn('flex w-full items-center justify-between py-3 text-left text-sm font-medium', 'focus-visible:ring-2 ring-blue-500 rounded-lg', className)}>
      <span>{children}</span>
      <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
    </button>
  );
}

type ContentProps = { value: string; className?: string; children: React.ReactNode };
export function AccordionContent({ value, className, children }: ContentProps) {
  const ctx = React.useContext(AccordionCtx)!;
  const open = ctx.openSet.has(value);
  return (
    <div aria-hidden={!open} className={cn('overflow-hidden', className)} style={{ maxHeight: open ? '999px' : '0px', transition: 'max-height .2s ease' }}>
      <div className="pb-3">{children}</div>
    </div>
  );
}
