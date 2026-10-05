"use client";
import useSWR from "swr";
import { authenticatedSWRFetcher } from "@/lib/fetchers/authenticatedSWRFetcher";
import { swrTransientRetryConfig } from "@/lib/fetchers/swrRetryPolicy";

type SessionItem = {
  at: string;
  ip: string;
  ua: string;
  os: string;
  browser: string;
  isMobile: boolean;
};

export function useUserSessions(userId: string, limit = 5) {
  return useSWR<{ items: SessionItem[] }>(
    `/api/admin/users/${userId}/sessions?limit=${limit}`,
    authenticatedSWRFetcher,
    {
      ...swrTransientRetryConfig,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );
}
