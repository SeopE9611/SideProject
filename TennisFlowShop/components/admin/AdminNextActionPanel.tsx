import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { adminTypography } from "@/components/admin/admin-typography";
import { cn } from "@/lib/utils";

export type AdminNextActionPanelTone = "urgent" | "warning" | "info" | "success";

type AdminNextActionPanelProps = {
  tone?: AdminNextActionPanelTone;
  badgeLabel?: string;
  stageLabel?: string;
  stage: ReactNode;
  nextActionTitle: ReactNode;
  nextActionDescription?: ReactNode;
  primaryAction?: ReactNode;
  secondaryActions?: ReactNode;
  footer?: ReactNode;
  note?: ReactNode;
  className?: string;
};

const toneClass: Record<AdminNextActionPanelTone, string> = {
  urgent: "border-destructive/30 bg-destructive/[0.025]",
  warning: "border-warning/35 bg-warning/[0.035]",
  info: "border-primary/20 bg-primary/[0.025]",
  success: "border-emerald-500/25 bg-emerald-500/[0.025]",
};

export default function AdminNextActionPanel({
  tone = "info",
  badgeLabel = "다음 작업",
  stageLabel = "현재 단계",
  stage,
  nextActionTitle,
  nextActionDescription,
  primaryAction,
  secondaryActions,
  footer,
  note,
  className,
}: AdminNextActionPanelProps) {
  return (
    <Card className={cn("border shadow-none", toneClass[tone], className)}>
      <CardContent className="p-4 sm:p-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className={adminTypography.panelTitle}>다음 작업</p>
              <Badge variant="outline" className="bg-background/70">
                {badgeLabel}
              </Badge>
            </div>
            <div className="space-y-1.5">
              <p className={cn("text-muted-foreground", adminTypography.caption)}>{stageLabel}</p>
              <p className={adminTypography.bodyStrong}>{stage}</p>
              <p className={cn("pt-1", adminTypography.body)}>
                <span className="font-semibold text-foreground">{nextActionTitle}</span>
                {nextActionDescription ? (
                  <span className="text-muted-foreground"> · {nextActionDescription}</span>
                ) : null}
              </p>
              {note ? <div className={cn("pt-1", adminTypography.meta)}>{note}</div> : null}
            </div>
          </div>
          {(primaryAction || secondaryActions) && (
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap lg:max-w-[360px] lg:justify-end">
              {primaryAction}
              {secondaryActions}
            </div>
          )}
        </div>
        {footer ? (
          <div className={cn("mt-4 border-t border-border/50 pt-3", adminTypography.meta)}>
            {footer}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
