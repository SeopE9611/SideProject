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
  variant?: "default" | "feature";
};

export default function MypageDetailCard({
  title,
  description,
  icon,
  action,
  children,
  className,
  contentClassName,
  variant = "default",
}: MypageDetailCardProps) {
  const isFeature = variant === "feature";

  return (
    <Card
      className={cn(
        "overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm shadow-foreground/[0.02]",
        isFeature && "border-brand-highlight-ink/20 shadow-none",
        className,
      )}
    >
      <CardHeader
        className={cn(
          "border-b border-border/60 bg-secondary/20 p-4 bp-sm:p-5",
          isFeature && "bg-brand-highlight-muted/45",
        )}
      >
        <div className="flex flex-col gap-3 bp-sm:flex-row bp-sm:items-start bp-sm:justify-between">
          <div className="min-w-0 space-y-1">
            <CardTitle
              className={cn(
                "flex min-w-0 items-center gap-2 text-ui-card-title font-medium",
              )}
            >
              {icon ? (
                <span className={cn("shrink-0", isFeature && "text-brand-highlight-ink")}>
                  {icon}
                </span>
              ) : null}
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
