"use client";

import useSWR from "swr";
import { authenticatedSWRFetcher } from "@/lib/fetchers/authenticatedSWRFetcher";
import { createSWRPollingRetryConfig } from "@/lib/fetchers/swrRetryPolicy";

type UnreadNotificationCountRes = { ok: true; count: number } | { ok: false; error: string };

const pollingRetryConfig = createSWRPollingRetryConfig(60_000);

export function useUnreadNotificationCount(enabled: boolean) {
  const { data, error, isLoading, mutate } = useSWR<UnreadNotificationCountRes>(
    enabled ? "/api/notifications/unread-count" : null,
    authenticatedSWRFetcher,
    {
      ...pollingRetryConfig,
      dedupingInterval: 10_000,
      refreshInterval: 60_000,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
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
