"use client";
import AsyncState from "@/components/system/AsyncState";
import { ChevronRight, Tags } from "lucide-react";
import Link from "next/link";
import useSWR from "swr";

type Post = { id: string; title: string; createdAt: string };
const fetcher = async (u: string) => {
  const res = await fetch(u, { credentials: "include" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

export default function HomeMarketPreview() {
  const { data, error, isLoading, mutate } = useSWR<{
    ok: boolean;
    items: Post[];
  }>("/api/community/posts?type=market&sort=latest&limit=5", fetcher);
  const items = data?.ok ? data.items : [];
  const hasError = Boolean(error) || (data && !data.ok);

  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Card Header */}
      <div className="flex items-center justify-between border-b border-border bg-muted/40 px-5 bp-sm:px-6 py-4 bp-sm:py-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-primary/20">
            <Tags className="h-4 w-4" />
          </div>
          <h2 className="text-base bp-sm:text-lg font-bold text-foreground">
            중고 거래 최신글
          </h2>
        </div>
        <Link
          className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs bp-sm:text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          href="/board/market"
        >
          더보기
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Card Body */}
      <div className="flex-1 px-2 bp-sm:px-3 py-2 bp-sm:py-3">
        {isLoading ? (
          <div className="flex flex-col gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={`skeleton-${i}`}
                className="flex items-center justify-between rounded-xl px-3 bp-sm:px-4 py-3 bp-sm:py-3.5"
              >
                <div className="flex-1">
                  <div className="h-4 w-3/4 animate-pulse rounded-md bg-muted" />
                </div>
                <div className="ml-4 h-3.5 w-14 animate-pulse rounded-md bg-muted" />
              </div>
            ))}
          </div>
        ) : hasError ? (
          <AsyncState
            kind="error"
            variant="card"
            resourceName="중고장터 글"
            className="mx-2 my-2"
            onAction={() => mutate()}
          />
        ) : items.length > 0 ? (
          <div className="flex flex-col gap-0.5">
            {items.map((p, idx) => (
              <Link
                key={p.id ?? `${p.createdAt}-${idx}`}
                className="group flex items-center justify-between gap-3 rounded-xl px-3 bp-sm:px-4 py-3 bp-sm:py-3.5 transition-colors hover:bg-muted/60"
                href={`/board/market/${p.id}`}
              >
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  <span className="hidden bp-sm:inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-primary/40" />
                  <span className="min-w-0 flex-1 truncate text-sm bp-sm:text-[15px] text-foreground/85 group-hover:text-foreground transition-colors">
                    {p.title}
                  </span>
                </div>
                <span className="shrink-0 text-[11px] bp-sm:text-xs tabular-nums text-muted-foreground">
                  {new Date(p.createdAt).toLocaleDateString("ko-KR", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <AsyncState
            kind="empty"
            variant="card"
            title="등록된 게시글이 없습니다"
            description="새 글이 등록되면 이곳에서 가장 먼저 볼 수 있어요."
            icon={<Tags className="h-4 w-4" />}
            className="mx-2 my-2"
          />
        )}
      </div>
    </div>
  );
}
