import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AdminInlineEmptyProps = {
  children: ReactNode;
  className?: string;
};

export default function AdminInlineEmpty({ children, className }: AdminInlineEmptyProps) {
  return (
    <p
      className={cn(
        "rounded-lg border border-dashed border-border/70 bg-muted/20 px-3 py-2 text-ui-body-sm text-muted-foreground",
        className,
      )}
    >
      {children}
    </p>
  );
}
