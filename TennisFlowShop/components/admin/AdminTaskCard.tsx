import type { ComponentType, ReactNode } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { adminTypography } from "@/components/admin/admin-typography";
import { cn } from "@/lib/utils";

type AdminTone = "neutral" | "success" | "warning" | "danger" | "info";

type AdminTaskCardProps = {
  title: string;
  count: number | string;
  description: ReactNode;
  tone?: AdminTone;
  meta?: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  actionLabel?: string;
  href?: string;
  onAction?: () => void;
  className?: string;
};

const toneClass: Record<AdminTone, string> = {
  neutral: "border-border bg-card",
  success: "border-success/40 bg-success/5",
  warning: "border-warning/40 bg-warning/5",
  danger: "border-destructive/40 bg-destructive/5",
  info: "border-info/40 bg-info/5",
};

const iconToneClass: Record<AdminTone, string> = {
  neutral: "bg-muted text-foreground/75",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-destructive/10 text-destructive",
  info: "bg-info/10 text-info",
};

export default function AdminTaskCard({
  title,
  count,
  description,
  tone = "neutral",
  meta,
  icon: Icon,
  actionLabel,
  href,
  onAction,
  className,
}: AdminTaskCardProps) {
  const action = actionLabel ? (
    <Button
      asChild={Boolean(href)}
      type={href ? undefined : "button"}
      size="sm"
      variant="outline"
      wrap="responsive"
      className={cn("min-h-8 w-full bg-background/70 py-1", adminTypography.actionLabel)}
      onClick={href ? undefined : onAction}
    >
      {href ? <Link href={href}>{actionLabel}</Link> : actionLabel}
    </Button>
  ) : null;

  return (
    <Card className={cn("shadow-sm", toneClass[tone], className)}>
      <CardHeader className="p-3 pb-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            {Icon ? (
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                  iconToneClass[tone],
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
            ) : null}
            <CardTitle className={cn("min-w-0 break-words", adminTypography.panelTitle)}>
              {title}
            </CardTitle>
          </div>
          <span className={cn("shrink-0 whitespace-nowrap", adminTypography.kpiValue)}>
            {typeof count === "number" ? `${count.toLocaleString("ko-KR")}건` : count}
          </span>
        </div>
        <p className={cn("min-h-[40px] break-words text-foreground/80", adminTypography.body)}>
          {description}
        </p>
        {meta ? <div className={cn("text-foreground/75", adminTypography.meta)}>{meta}</div> : null}
      </CardHeader>
      {action ? <CardContent className="p-3 pt-0">{action}</CardContent> : null}
    </Card>
  );
}
