import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type CatalogToolbarProps = {
  filterButton: ReactNode;
  quickFilters?: ReactNode;
  soldOutToggle?: ReactNode;
  viewToggle?: ReactNode;
  sortControl: ReactNode;
  className?: string;
};
export function CatalogToolbar({
  filterButton,
  quickFilters,
  soldOutToggle,
  viewToggle,
  sortControl,
  className,
}: CatalogToolbarProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 bp-md:flex-row bp-md:items-center bp-md:justify-between",
        className,
      )}
    >
      <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-2 bp-md:flex bp-md:flex-wrap bp-md:items-center">
        {filterButton}
        <div className="min-w-0 bp-md:hidden">{sortControl}</div>
        {quickFilters ? (
          <div className="col-span-2 grid grid-cols-2 gap-2 bp-sm:grid-cols-4 bp-md:flex bp-md:flex-wrap bp-md:items-center">
            {quickFilters}
          </div>
        ) : null}
        {soldOutToggle ? (
          <div className="col-span-2 grid grid-cols-1 bp-md:block">{soldOutToggle}</div>
        ) : null}
      </div>
      <div className="hidden min-w-0 items-center justify-end gap-2 bp-md:flex">
        {viewToggle}
        {sortControl}
      </div>
    </div>
  );
}
