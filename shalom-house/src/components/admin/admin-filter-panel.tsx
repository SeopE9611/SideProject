import type { ReactNode } from "react";

type AdminFilterPanelProps = {
  headingId: string;
  title: string;
  totalItems: number;
  page: number;
  totalPages: number;
  children: ReactNode;
};

export function AdminFilterPanel(props: AdminFilterPanelProps) {
  return (
    <section aria-labelledby={props.headingId} className="rounded-card border border-border bg-surface p-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 id={props.headingId} className="text-heading font-bold">{props.title}</h2>
        <p className="text-small text-muted-foreground">
          전체 {props.totalItems}건 · 현재 {props.page} / {props.totalPages} 페이지
        </p>
      </div>
      {props.children}
    </section>
  );
}
