"use client";

import useSWR from "swr";

type UnreadCountRes =
  | { ok: true; count: number }
  | { ok: false; error: string };

const fetcher = async (url: string): Promise<UnreadCountRes> => {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    throw new Error(`unread-count fetch failed: ${res.status}`);
  }
  return res.json();
};

// 상단 네비게이션의 'N(새 쪽지)' 뱃지를 위해 미열람 개수를 가볍게 폴링
export function useUnreadMessageCount(enabled: boolean) {
  const { data, error, isLoading, mutate } = useSWR<UnreadCountRes>(
    enabled ? "/api/messages/unread-count" : null,
    fetcher,
    {
      dedupingInterval: 10_000,
      refreshInterval: 60_000,
      revalidateOnFocus: false,
    },
  );

  // 실패/미확정을 실제 0개와 분리하기 위해 nullable count + status를 함께 반환한다.
  const hasApiError = Boolean(data && !data.ok);
  const status: "loading" | "ready" | "error" = isLoading
    ? "loading"
    : error || hasApiError
      ? "error"
      : "ready";
  const count = status === "ready" && data && data.ok ? data.count : null;
  return { count, status, data, error, isLoading, mutate };
}
