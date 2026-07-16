import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Props = {
  viewMode: "grid" | "list";
  media: ReactNode;
  content: ReactNode;
  price?: ReactNode;
  actions?: ReactNode;
  footerMeta?: ReactNode;
  className?: string;
  mediaClassName?: string;
  contentClassName?: string;
  actionColumnClassName?: string;
};

const surfaceClass =
  "group h-full overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-[box-shadow,border-color,background-color] duration-200 hover:bg-muted/20 hover:shadow-sm";

export function CatalogCardFrame({
  viewMode,
  media,
  content,
  price,
  actions,
  footerMeta,
  className,
  mediaClassName,
  contentClassName,
  actionColumnClassName,
}: Props) {
  if (viewMode === "list") {
    return (
      <Card className={cn(surfaceClass, className)}>
        <div className="grid h-full min-w-0 grid-cols-1 bp-md:grid-cols-[240px_minmax(0,1fr)_230px] bp-lg:grid-cols-[260px_minmax(0,1fr)_240px]">
          <div className={cn("min-w-0", mediaClassName)}>{media}</div>
          <div className={cn("flex min-w-0 flex-col p-4 bp-sm:p-5 bp-md:p-6", contentClassName)}>
            <div className="min-w-0 flex-1">{content}</div>
            {footerMeta ? <div className="mt-4">{footerMeta}</div> : null}
          </div>
          <div
            className={cn(
              "flex min-w-0 flex-col justify-between gap-4 border-t border-border/60 bg-muted/10 p-4 bp-md:border-l bp-md:border-t-0 bp-md:p-5",
              actionColumnClassName,
            )}
          >
            {price ? <div className="bp-md:text-right">{price}</div> : null}
            {actions ? <div className="grid w-full gap-2">{actions}</div> : null}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn(surfaceClass, "flex flex-col", className)}>
      <div className={cn("min-w-0", mediaClassName)}>{media}</div>
      <div className={cn("flex flex-1 flex-col p-4 bp-sm:p-5", contentClassName)}>
        <div className="min-w-0 flex-1">{content}</div>
        {footerMeta ? <div className="mt-4">{footerMeta}</div> : null}
        <div className="mt-auto space-y-3 pt-4">
          {price}
          {actions}
        </div>
      </div>
    </Card>
  );
}
