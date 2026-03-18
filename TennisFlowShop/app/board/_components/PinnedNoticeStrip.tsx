import { Bell, Pin } from "lucide-react";
import Link from "next/link";

const pinnedNoticeMobileTitleClampClass =
  "line-clamp-2 text-[13px] font-medium leading-snug text-foreground group-hover:text-primary sm:line-clamp-1";

import { Badge } from "@/components/ui/badge";

export type PinnedNoticeItem = {
  _id: string;
  title: string;
  createdAt: string | Date;
};

function fmtDate(value: string | Date) {
  return new Date(value)
    .toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    .replace(/\.\s/g, ".")
    .replace(/\.$/, "");
}

export default function PinnedNoticeStrip({
  items,
}: {
  items: PinnedNoticeItem[];
}) {
  if (!items.length) return null;

  return (
    <section
      className="rounded-lg border border-primary/25 bg-primary/[0.04] px-3 py-2.5 sm:px-3.5"
      aria-label="운영 공지"
    >
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/15 text-primary dark:bg-primary/25">
          <Bell className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">
            중요 안내 · 공지사항
          </p>
          <p className="text-[10px] text-muted-foreground">
            운영팀이 고정한 공지입니다. 게시판 이용 전 한 번 확인해 주세요.
          </p>
        </div>
      </div>

      <div className="mt-2.5 space-y-1.5">
        {items.map((notice) => (
          <Link
            key={notice._id}
            href={`/board/notice/${notice._id}`}
            className="group flex items-start gap-2 rounded-md border border-primary/15 bg-background/70 px-2.5 py-1.5 transition-colors hover:bg-primary/[0.07] dark:bg-background/60"
          >
            <Badge
              variant="brand"
              className="mt-0.5 shrink-0 px-1.5 py-0 text-[10px] leading-4"
            >
              <Pin className="h-3 w-3" />
            </Badge>
            <div className="min-w-0 flex-1">
              <p className={pinnedNoticeMobileTitleClampClass}>
                {notice.title}
              </p>
              <p className="mt-0 text-[10px] leading-tight text-muted-foreground">
                {fmtDate(notice.createdAt)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
