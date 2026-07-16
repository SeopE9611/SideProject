import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type CommercePurchaseActionsProps = {
  primary: ReactNode;
  secondary?: ReactNode;
  tertiary?: ReactNode;
  helper?: ReactNode;
  className?: string;
};

export function CommercePurchaseActions({ primary, secondary, tertiary, helper, className }: CommercePurchaseActionsProps) {
  const hasBoth = Boolean(secondary && tertiary);
  return (
    <div className={cn("space-y-3", className)}>
      <div className="[&_*]:whitespace-nowrap">{primary}</div>
      {(secondary || tertiary) && (
        <div className={cn("grid gap-3 [&_*]:whitespace-nowrap", hasBoth && "bp-sm:grid-cols-2")}>
          {secondary ? <div>{secondary}</div> : null}
          {tertiary ? <div>{tertiary}</div> : null}
        </div>
      )}
      {helper ? <div className="text-ui-label leading-relaxed text-muted-foreground">{helper}</div> : null}
    </div>
  );
}
