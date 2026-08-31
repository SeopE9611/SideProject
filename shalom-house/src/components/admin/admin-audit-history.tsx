import type { AdminAuditHistoryItem } from "@/features/admin-audit/admin-audit.types";

type AdminAuditHistoryProps = {
  heading?: string;
  items: readonly AdminAuditHistoryItem[];
};

const formatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "시간 확인 불가";
  }

  const parts = formatter.formatToParts(date);
  const values = new Map(
    parts.map((part) => [part.type, part.value]),
  );

  const year = values.get("year");
  const month = values.get("month");
  const day = values.get("day");
  const hour = values.get("hour");
  const minute = values.get("minute");

  if (!year || !month || !day || !hour || !minute) {
    return "시간 확인 불가";
  }

  return `${year}.${month}.${day} ${hour}:${minute}`;
}

export function AdminAuditHistory({ heading = "수정 이력", items }: AdminAuditHistoryProps) {
  const headingId = "admin-audit-history-heading";
  return (
    <section aria-labelledby={headingId} className="min-w-0 rounded-card border border-border bg-surface p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={headingId} className="text-heading font-bold">{heading}</h2>
        <p className="text-small text-muted-foreground">총 {items.length}건</p>
      </div>
      {items.length === 0 ? <p className="mt-4">아직 기록된 수정 이력이 없습니다.</p> : (
        <ol className="mt-5 space-y-5">
          {items.map((item) => (
            <li key={item.id} className="min-w-0 border-t border-border pt-4 first:border-t-0 first:pt-0">
              <p className="text-safe-wrap font-bold">{item.actionLabel}</p>
              <dl className="mt-2 grid min-w-0 gap-2 sm:grid-cols-2">
                <div className="min-w-0"><dt className="text-small font-semibold text-muted-foreground">작업 관리자</dt><dd className="text-safe-wrap break-words">{item.actorDisplayName}</dd></div>
                <div><dt className="text-small font-semibold text-muted-foreground">변경 시각</dt><dd><time dateTime={item.occurredAt}>{formatDate(item.occurredAt)}</time></dd></div>
              </dl>
              <div className="mt-3"><p className="text-small font-semibold text-muted-foreground">변경 필드</p><ul className="mt-1 flex min-w-0 flex-wrap gap-2">{(item.changedFieldLabels.length ? item.changedFieldLabels : ["상태 기록"]).map((label) => <li key={label} className="text-safe-wrap rounded-control border border-border px-2 py-1 text-small">{label}</li>)}</ul></div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
