import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type ResponsiveActionGroupProps = {
  primaryAction?: ReactNode;
  detailAction: ReactNode;
  overflowAction?: ReactNode;
  className?: string;
};

export function ResponsiveActionGroup({
  primaryAction,
  detailAction,
  overflowAction,
  className,
}: ResponsiveActionGroupProps) {
  return (
    <div className={cn("grid w-full grid-cols-[minmax(0,1fr)_44px] gap-2", className)}>
      {primaryAction ? <div className="col-span-2 min-w-0">{primaryAction}</div> : null}
      <div className={cn("min-w-0", !overflowAction && "col-span-2")}>{detailAction}</div>
      {overflowAction ? (
        <div className="flex h-11 w-11 shrink-0 items-center justify-center md:h-9 md:w-10">
          {overflowAction}
        </div>
      ) : null}
    </div>
  );
}
