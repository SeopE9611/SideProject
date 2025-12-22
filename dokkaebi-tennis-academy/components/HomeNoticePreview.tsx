'use client';
import useSWR from 'swr';
import Link from 'next/link';

type Notice = { id: string; title: string; createdAt: string };
const fetcher = (u: string) => fetch(u).then((r) => r.json());

export default function HomeNoticePreview() {
  const { data, isLoading } = useSWR<{ ok: boolean; items: Notice[] }>('/api/boards?type=notice&limit=5', fetcher);
  const items = data?.ok ? data.items : [];

  return (
    <section className="mt-12">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">공지사항</h2>
        <Link className="text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors" href="/board/notice">
          더보기
        </Link>
      </div>
      <ul className="space-y-3">
        {isLoading ? (
          <>
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={`skeleton-${i}`} className="rounded-lg bg-white/60 p-3 dark:bg-black/20">
                <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                <div className="mt-2 h-3 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              </li>
            ))}
          </>
        ) : items.length > 0 ? (
          items.map((p, idx) => (
            <li key={p.id ?? `${p.createdAt}-${idx}`}>
              <Link className="group flex items-start justify-between gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-900" href={`/board/notice/${p.id}`}>
                <span className="flex-1 truncate text-sm text-slate-700 group-hover:text-slate-900 dark:text-slate-300 dark:group-hover:text-white">{p.title}</span>
                <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">{new Date(p.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}</span>
              </Link>
            </li>
          ))
        ) : (
          <li key="empty" className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
            등록된 공지사항이 없습니다
          </li>
        )}
      </ul>
    </section>
  );
}
