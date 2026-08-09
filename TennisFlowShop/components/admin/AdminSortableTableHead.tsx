import type { ComponentProps, ReactNode } from "react";
import { ChevronDown } from "lucide-react";

import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";

type SortDirection = "asc" | "desc";

type AdminSortableTableHeadProps = Omit<
  ComponentProps<typeof TableHead>,
  "aria-sort" | "children" | "onClick"
> & {
  label: string;
  active: boolean;
  direction: SortDirection;
  align?: "left" | "center" | "right";
  onSort: () => void;
  children?: ReactNode;
};

export function AdminSortableTableHead({
  label,
  active,
  direction,
  align = "left",
  onSort,
  className,
  children,
  ...props
}: AdminSortableTableHeadProps) {
  const stateLabel = active ? (direction === "asc" ? "오름차순" : "내림차순") : "정렬 안 됨";

  return (
    <TableHead
      scope="col"
      aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : "none"}
      className={className}
      {...props}
    >
      <button
        type="button"
        onClick={onSort}
        aria-label={`${label}, 현재 ${stateLabel}. 정렬 변경`}
        className={cn(
          "inline-flex w-full items-center gap-1 rounded-sm text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          align === "left" && "justify-start text-left",
          align === "center" && "justify-center text-center",
          align === "right" && "justify-end text-right",
          active && "text-primary",
        )}
      >
        {children ?? label}
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "h-3 w-3 shrink-0 text-muted-foreground transition-transform",
            active && direction === "desc" && "rotate-180",
          )}
        />
      </button>
    </TableHead>
  );
}
