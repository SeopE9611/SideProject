"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { NotificationListItem } from "@/lib/hooks/useNotificationList";

const TYPE_LABEL: Record<string, string> = {
  message: "쪽지",
  order_status: "주문",
  academy_status: "아카데미",
  point_granted: "포인트",
  point_deducted: "포인트",
  system: "시스템",
  package_status: "패키지",
  stringing_status: "스트링",
};

function relativeTime(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(diff)) return "";
  const minutes = Math.max(0, Math.floor(diff / 60_000));
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export function NotificationItem({
  item,
  onClick,
}: {
  item: NotificationListItem;
  onClick: () => void;
}) {
  const unread = !item.readAt;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full gap-3 rounded-xl border border-border/60 bg-card px-4 py-4 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-5",
        unread && "border-primary/40 bg-primary/5 shadow-sm",
      )}
    >
      <span
        className={cn(
          "mt-2 h-2 w-2 shrink-0 rounded-full",
          unread ? "bg-primary" : "bg-transparent",
        )}
      />
      <span className="min-w-0 flex-1 space-y-1">
        <span className="flex min-w-0 flex-wrap items-center gap-2">
          <Badge
            variant={unread ? "brand" : "secondary"}
            className="h-5 shrink-0 px-1.5 text-ui-micro"
          >
            {TYPE_LABEL[item.type] ?? "알림"}
          </Badge>
          <span className="shrink-0 text-ui-label text-muted-foreground">
            {relativeTime(item.createdAt)}
          </span>
          {unread && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-ui-label font-semibold text-primary">
              읽지 않음
            </span>
          )}
        </span>
        <span className="block line-clamp-2 break-keep text-ui-body-sm font-semibold leading-6 sm:text-ui-body text-foreground">
          {item.title}
        </span>
        {item.body && (
          <span className="line-clamp-2 break-words text-ui-body-sm leading-6 text-muted-foreground">
            {item.body}
          </span>
        )}
      </span>
    </button>
  );
}
