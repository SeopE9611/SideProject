'use client';
import useSWR from 'swr';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

type Post = { id: string; title: string; createdAt: string };
const fetcher = async (u: string) => {
  const res = await fetch(u, { credentials: 'include' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

export default function HomeMarketPreview() {
  const { data, error, isLoading, mutate } = useSWR<{ ok: boolean; items: Post[] }>('/api/community/posts?type=market&sort=latest&limit=5', fetcher);
  const items = data?.ok ? data.items : [];
  const hasError = Boolean(error) || (data && !data.ok);

  return (
    <section className="mt-8 bp-sm:mt-10 bp-md:mt-12">
      <div className="mb-4 bp-sm:mb-5 flex items-center justify-between">
        <h2 className="text-xl bp-sm:text-2xl font-semibold text-foreground">중고 거래 최신글</h2>
        <Link className="text-sm bp-sm:text-base text-muted-foreground hover:text-primary transition-colors" href="/board/market">
          더보기
        </Link>
      </div>
      <ul className="space-y-3 bp-sm:space-y-4">
        {isLoading ? (
          <>
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={`skeleton-${i}`} className="rounded-lg bg-card/70 p-4 bp-sm:p-5">
                <div className="h-4 bp-sm:h-5 w-3/4 animate-pulse rounded bg-muted" />
                <div className="mt-2 bp-sm:mt-2.5 h-3 bp-sm:h-4 w-24 bp-sm:w-28 animate-pulse rounded bg-muted" />
              </li>
            ))}
          </>
          ) : hasError ? (
          <li className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 bp-sm:p-5 text-sm bp-sm:text-base text-destructive">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="flex-1">
                <p className="font-semibold">중고장터 글을 불러오지 못했어요.</p>
                <p className="mt-1 text-xs bp-sm:text-sm opacity-90">
                  네트워크/서버 상태를 확인한 뒤 다시 시도해 주세요.
                </p>
                <button
                  type="button"
                  onClick={() => mutate()}
                  className="mt-3 inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-xs bp-sm:text-sm font-semibold text-primary-foreground shadow-sm ring-1 ring-inset ring-ring/30 hover:bg-primary/90"
                >
                  다시 시도
                </button>
              </div>
            </div>
          </li>
        ) : items.length > 0 ? (
          items.map((p, idx) => (
            <li key={p.id ?? `${p.createdAt}-${idx}`}>
              <Link className="group flex items-start justify-between gap-3 bp-sm:gap-4 rounded-lg px-4 bp-sm:px-5 py-3 bp-sm:py-4 transition-colors hover:bg-primary/10 dark:hover:bg-primary/20 hover:text-foreground" href={`/board/market/${p.id}`}>
                <span className="flex-1 line-clamp-2 bp-lg:line-clamp-1 text-sm bp-sm:text-base text-foreground/80 group-hover:text-foreground ">{p.title}</span>
                <span className="shrink-0 text-xs bp-sm:text-sm text-muted-foreground">{new Date(p.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}</span>
              </Link>
            </li>
          ))
        ) : (
          <li className="py-10 bp-sm:py-12 text-center text-sm bp-sm:text-base text-muted-foreground">등록된 게시글이 없습니다</li>
        )}
      </ul>
    </section>
  );
}
