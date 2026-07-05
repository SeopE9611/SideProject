import type { ReactNode } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type MypageDetailCardProps = {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

export default function MypageDetailCard({
  title,
  description,
  icon,
  action,
  children,
  className,
  contentClassName,
}: MypageDetailCardProps) {
  return (
    <Card
      className={cn(
        "overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm shadow-foreground/[0.02]",
        className,
      )}
    >
      <CardHeader className="border-b border-border/60 bg-secondary/20 p-4 bp-sm:p-5">
        <div className="flex flex-col gap-3 bp-sm:flex-row bp-sm:items-start bp-sm:justify-between">
          <div className="min-w-0 space-y-1">
            <CardTitle className="flex min-w-0 items-center gap-2 text-ui-card-title font-medium">
              {icon ? <span className="shrink-0">{icon}</span> : null}
              <span className="min-w-0 break-words">{title}</span>
            </CardTitle>
            {description ? <CardDescription>{description}</CardDescription> : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      </CardHeader>
      <CardContent className={cn("p-4 bp-sm:p-5", contentClassName)}>{children}</CardContent>
    </Card>
  );
}
