import type { ReactNode } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type CommerceDetailTabItem = {
  value: string;
  label: string;
  shortLabel: string;
  ariaLabel: string;
  icon: ReactNode;
  count?: number;
};
type Props = {
  value: string;
  onValueChange: (value: string) => void;
  items: CommerceDetailTabItem[];
  children: ReactNode;
};
export function CommerceDetailTabs({ value, onValueChange, items, children }: Props) {
  return (
    <Tabs value={value} onValueChange={onValueChange} className="w-full">
      <TabsList className="grid h-auto w-full grid-cols-4 gap-1 border-b border-border bg-muted/30 p-1 bp-sm:gap-1.5 bp-sm:p-1.5">
        {items.map((item) => (
          <TabsTrigger
            key={item.value}
            value={item.value}
            aria-label={item.ariaLabel}
            className="h-12 min-w-0 rounded-xl px-1.5 text-ui-label font-medium leading-none transition-[background-color,color,border-color,box-shadow,opacity] data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm bp-sm:h-14 bp-sm:px-3 bp-sm:text-ui-body bp-md:h-16 bp-md:text-ui-card-title-lg"
          >
            <span className="mr-1 shrink-0 bp-sm:mr-2">{item.icon}</span>
            <span className="hidden min-w-0 bp-sm:inline">{item.label}</span>
            <span className="min-w-0 bp-sm:hidden">{item.shortLabel}</span>
            {typeof item.count === "number" ? (
              <span className="ml-0.5 shrink-0 tabular-nums text-muted-foreground bp-sm:ml-1.5">
                ({item.count})
              </span>
            ) : null}
          </TabsTrigger>
        ))}
      </TabsList>
      {children}
    </Tabs>
  );
}
