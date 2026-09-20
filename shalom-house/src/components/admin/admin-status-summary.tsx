import type { ReactNode } from "react";

export type AdminStatusSummaryItem = {
  label: string;
  value: ReactNode;
  emphasized?: boolean;
};

export function AdminStatusSummary({ items }: { items: readonly AdminStatusSummaryItem[] }) {
  return (
    <section aria-labelledby="admin-status-summary-heading" className="rounded-card border border-border bg-surface p-5">
      <h2 id="admin-status-summary-heading" className="text-heading font-bold">
        현재 상태
      </h2>
      <dl className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map(({ label, value, emphasized }) => (
          <div key={label} className="min-w-0">
            <dt className="text-small font-semibold text-muted-foreground">{label}</dt>
            <dd className={`mt-1 break-words${emphasized ? " font-semibold" : ""}`}>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
