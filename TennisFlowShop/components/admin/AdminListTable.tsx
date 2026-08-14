import type { ReactNode } from "react";

import { adminDataTable } from "@/components/admin/AdminDataTable";
import { adminTypography } from "@/components/admin/admin-typography";
import { cn } from "@/lib/utils";

type AdminListTableProps = {
  title: string;
  viewLabel: string;
  resultLabel: string;
  description?: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  columnsClassName?: string;
  ariaLabel?: string;
};

/** 관리자 목록의 결과 메타와 CSS Grid list-table 표면을 한 규격으로 묶습니다. */
export function AdminListTable({
  title,
  viewLabel,
  resultLabel,
  description,
  children,
  className,
  contentClassName,
  columnsClassName,
  ariaLabel = title,
}: AdminListTableProps) {
  return (
    <section
      aria-label={ariaLabel}
      className={cn("overflow-hidden rounded-lg border border-border bg-background", className)}
    >
      <header className="border-b border-border bg-muted/15 px-4 py-2.5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-ui-body font-semibold text-foreground">{title}</h2>
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
      </header>
      <div
        role="table"
        aria-label={ariaLabel}
        data-columns-class={columnsClassName}
        className={cn("min-w-0", contentClassName)}
      >
        {children}
      </div>
    </section>
  );
}

export function AdminListColumnHeader({
  children,
  className,
  columnsClassName,
}: {
  children: ReactNode;
  className?: string;
  columnsClassName: string;
}) {
  return (
    <div
      role="row"
      className={cn(
        "grid min-h-10 min-w-0 items-center border-b border-border bg-muted/20",
        adminTypography.tableHeader,
        columnsClassName,
        className,
      )}
    >
      {children}
    </div>
  );
}

export function AdminListBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div role="rowgroup" className={className}>
      {children}
    </div>
  );
}

export function AdminListRow({
  children,
  className,
  columnsClassName,
  ariaLabel,
}: {
  children: ReactNode;
  className?: string;
  columnsClassName: string;
  ariaLabel?: string;
}) {
  return (
    <div
      role="row"
      aria-label={ariaLabel}
      className={cn(
        "grid min-h-20 min-w-0 items-center border-b border-border transition-[background-color] last:border-b-0 hover:bg-muted/20",
        columnsClassName,
        className,
      )}
    >
      {children}
    </div>
  );
}

export function AdminListCell({
  children,
  className,
  align = "start",
}: {
  children: ReactNode;
  className?: string;
  align?: "start" | "center" | "end";
}) {
  return (
    <div
      role="cell"
      className={cn(
        "min-w-0 px-4 py-2.5",
        align === "start" && "text-left",
        align === "center" && "text-center [&>*]:mx-auto",
        align === "end" && "text-right [&>*]:ml-auto",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function AdminListPrimary({
  title,
  meta,
  supporting,
  className,
}: {
  title: ReactNode;
  meta?: ReactNode;
  supporting?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 space-y-1", className)}>
      <div className={cn("line-clamp-2 break-keep", adminTypography.tablePrimary)}>{title}</div>
      {meta ? (
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-ui-label text-muted-foreground">
          {meta}
        </div>
      ) : null}
      {supporting ? (
        <div className="line-clamp-2 text-ui-label leading-relaxed text-foreground/80">
          {supporting}
        </div>
      ) : null}
    </div>
  );
}

export function AdminStatusGroup({
  primary,
  secondary,
  alert,
  alertTone = "attention",
  className,
}: {
  primary: ReactNode;
  secondary?: ReactNode;
  alert?: ReactNode;
  alertTone?: "attention" | "danger";
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col items-start gap-1", className)}>
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">{primary}</div>
      {secondary ? (
        <div className={cn("line-clamp-2", adminDataTable.secondaryLine)}>{secondary}</div>
      ) : null}
      {alert ? (
        <div
          className={
            alertTone === "danger"
              ? adminDataTable.dangerText
              : adminDataTable.attentionText
          }
        >
          {alert}
        </div>
      ) : null}
    </div>
  );
}

export function AdminMoneyBlock({
  amount,
  meta,
  detailAction,
  className,
}: {
  amount: ReactNode;
  meta?: ReactNode;
  detailAction?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col items-end gap-1 text-right", className)}>
      <div className={adminTypography.money}>{amount}</div>
      {meta ? <div className="text-ui-label text-muted-foreground">{meta}</div> : null}
      {detailAction ? <div className="text-ui-label">{detailAction}</div> : null}
    </div>
  );
}

export function AdminRowActions({ children }: { children: ReactNode }) {
  return <div className="flex min-w-0 items-center justify-end gap-1">{children}</div>;
}
