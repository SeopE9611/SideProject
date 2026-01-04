'use client';
import useSWR from 'swr';
import Link from 'next/link';

type Post = { id: string; title: string; createdAt: string };
const fetcher = (u: string) => fetch(u).then((r) => r.json());

export default function HomeMarketPreview() {
  const { data, isLoading } = useSWR<{ ok: boolean; items: Post[] }>('/api/community/posts?type=market&sort=latest&limit=5', fetcher);
  const items = data?.ok ? data.items : [];

  return (
    <section className="mt-8 sm:mt-10 md:mt-12">
      <div className="mb-4 sm:mb-5 flex items-center justify-between">
        <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white">중고 거래 최신글</h2>
        <Link className="text-sm sm:text-base text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors" href="/board/market">
          더보기
        </Link>
      </div>
      <ul className="space-y-3 sm:space-y-4">
        {isLoading ? (
          <>
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={`skeleton-${i}`} className="rounded-lg bg-white/60 p-4 sm:p-5 dark:bg-black/20">
                <div className="h-4 sm:h-5 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                <div className="mt-2 sm:mt-2.5 h-3 sm:h-4 w-24 sm:w-28 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              </li>
            ))}
          </>
        ) : items.length > 0 ? (
          items.map((p, idx) => (
            <li key={p.id ?? `${p.createdAt}-${idx}`}>
              <Link className="group flex items-start justify-between gap-3 sm:gap-4 rounded-lg px-4 sm:px-5 py-3 sm:py-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-900" href={`/board/market/${p.id}`}>
                <span className="flex-1 line-clamp-2 bp-lg:line-clamp-1 text-sm sm:text-base text-slate-700 group-hover:text-slate-900 dark:text-slate-300 dark:group-hover:text-white">{p.title}</span>
                <span className="shrink-0 text-xs sm:text-sm text-slate-500 dark:text-slate-400">{new Date(p.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}</span>
              </Link>
            </li>
          ))
        ) : (
          <li className="py-10 sm:py-12 text-center text-sm sm:text-base text-slate-500 dark:text-slate-400">등록된 게시글이 없습니다</li>
        )}
      </ul>
    </section>
  );
}
