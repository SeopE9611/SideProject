"use client";

import useSWR from "swr";

type UnreadNotificationCountRes =
  | { ok: true; count: number }
  | { ok: false; error: string };

const fetcher = async (url: string): Promise<UnreadNotificationCountRes> => {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`notification unread-count fetch failed: ${res.status}`);
  return res.json();
};

export function useUnreadNotificationCount(enabled: boolean) {
  const { data, error, isLoading, mutate } = useSWR<UnreadNotificationCountRes>(
    enabled ? "/api/notifications/unread-count" : null,
    fetcher,
    {
      dedupingInterval: 10_000,
      refreshInterval: 60_000,
      revalidateOnFocus: false,
    },
  );

  const hasApiError = Boolean(data && !data.ok);
  const status: "loading" | "ready" | "error" = isLoading
    ? "loading"
    : error || hasApiError
      ? "error"
      : "ready";
  const count = status === "ready" && data && data.ok ? data.count : null;
  return { count, status, data, error, isLoading, mutate };
}
