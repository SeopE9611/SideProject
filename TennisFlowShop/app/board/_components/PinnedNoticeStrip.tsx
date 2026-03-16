import { Bell, Pin } from 'lucide-react';
import Link from 'next/link';

const pinnedNoticeMobileTitleClampClass = 'line-clamp-2 text-sm font-medium leading-snug text-foreground group-hover:text-primary sm:line-clamp-1';

import { Badge } from '@/components/ui/badge';

export type PinnedNoticeItem = {
  _id: string;
  title: string;
  createdAt: string | Date;
};

function fmtDate(value: string | Date) {
  return new Date(value).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export default function PinnedNoticeStrip({ items }: { items: PinnedNoticeItem[] }) {
  if (!items.length) return null;

  return (
    <section className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-3 sm:px-4" aria-label="운영 공지">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15 text-primary dark:bg-primary/25">
          <Bell className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">중요 안내 · 공지사항</p>
          <p className="text-[11px] text-muted-foreground">운영팀이 고정한 공지입니다. 게시판 이용 전 한 번 확인해 주세요.</p>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {items.map((notice) => (
          <Link
            key={notice._id}
            href={`/board/notice/${notice._id}`}
            className="group flex items-start gap-2 rounded-md border border-primary/20 bg-background/80 px-2.5 py-2 transition-colors hover:bg-primary/10 dark:bg-background/70"
          >
            <Badge variant="brand" className="mt-0.5 shrink-0 px-1.5 py-0 text-[10px] leading-4">
              <Pin className="h-3 w-3" />
            </Badge>
            <div className="min-w-0 flex-1">
              <p className={pinnedNoticeMobileTitleClampClass}>{notice.title}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{fmtDate(notice.createdAt)}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
