import type { ReactNode } from "react";

import { adminDataTable } from "@/components/admin/AdminDataTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type AdminListTableProps = {
  title: string;
  viewLabel: string;
  resultLabel: string;
  description?: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

/** 관리자 목록의 결과 메타와 list-table 표면을 한 규격으로 묶는 공통 프레임입니다. */
export function AdminListTable({
  title,
  viewLabel,
  resultLabel,
  description,
  children,
  className,
  contentClassName,
}: AdminListTableProps) {
  return (
    <Card className={cn("overflow-hidden border-border/70 shadow-sm", className)}>
      <CardHeader className="border-b border-border/60 bg-muted/15 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-ui-body font-semibold">{title}</CardTitle>
              <span className="text-ui-label font-medium text-primary">{viewLabel}</span>
            </div>
            {description ? (
              <p className="mt-1 text-ui-label text-muted-foreground">{description}</p>
            ) : null}
          </div>
          <p className="shrink-0 text-ui-label font-medium tabular-nums text-muted-foreground">
            {resultLabel}
          </p>
        </div>
      </CardHeader>
      <CardContent className={cn("relative overflow-x-auto p-0", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}

export function AdminListRow({ className }: { className?: string }) {
  return cn(adminDataTable.row, "group align-top hover:bg-muted/30", className);
}

export function AdminStatusGroup({
  primary,
  secondary,
  alert,
  className,
}: {
  primary: ReactNode;
  secondary?: ReactNode;
  alert?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col items-start gap-1.5", className)}>
      {primary}
      {secondary ? <div className={adminDataTable.secondaryLine}>{secondary}</div> : null}
      {alert ? <div className={adminDataTable.attentionText}>{alert}</div> : null}
    </div>
  );
}

export function AdminRowActions({ children }: { children: ReactNode }) {
  return <div className="flex items-center justify-end gap-1.5">{children}</div>;
}
