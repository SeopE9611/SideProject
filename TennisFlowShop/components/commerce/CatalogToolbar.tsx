import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type CatalogToolbarProps = { filterButton: ReactNode; quickFilters?: ReactNode; soldOutToggle?: ReactNode; viewToggle?: ReactNode; sortControl: ReactNode; className?: string };
export function CatalogToolbar({ filterButton, quickFilters, soldOutToggle, viewToggle, sortControl, className }: CatalogToolbarProps) {
  return (
    <div className={cn("flex flex-col gap-3 bp-lg:flex-row bp-lg:items-center bp-lg:justify-between", className)}>
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(132px,0.8fr)] gap-2 bp-sm:flex bp-sm:flex-wrap bp-sm:items-center">
        {filterButton}
        <div className="bp-sm:hidden">{sortControl}</div>
        {quickFilters ? <div className="col-span-2 grid grid-cols-2 gap-2 bp-sm:flex bp-sm:flex-wrap bp-sm:items-center">{quickFilters}</div> : null}
        {soldOutToggle ? <div className="col-span-2 grid grid-cols-1 bp-sm:block">{soldOutToggle}</div> : null}
      </div>
      <div className="hidden min-w-0 items-center justify-end gap-2 bp-sm:flex">{viewToggle}{sortControl}</div>
    </div>
  );
}
