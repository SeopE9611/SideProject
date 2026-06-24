"use client";

import useSWR, { useSWRConfig } from "swr";

export type NotificationListItem = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  createdAt: string;
  readAt: string | null;
  priority?: string;
};

type NotificationListRes =
  | {
      ok: true;
      items: NotificationListItem[];
      unreadCount: number;
      hasMore: boolean;
      nextCursor: string | null;
    }
  | { ok: false; error: string };

const fetcher = async (url: string): Promise<NotificationListRes> => {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`notifications fetch failed: ${res.status}`);
  return res.json();
};

export function useNotificationList({
  enabled,
  limit = 10,
}: {
  enabled: boolean;
  limit?: number;
}) {
  const { mutate: globalMutate } = useSWRConfig();
  const key = enabled ? `/api/notifications?limit=${limit}` : null;
  const { data, error, isLoading, mutate } = useSWR<NotificationListRes>(
    key,
    fetcher,
    {
      revalidateOnFocus: false,
    },
  );

  const markAsRead = async (id: string) => {
    const res = await fetch(`/api/notifications/${id}/read`, {
      method: "PATCH",
      credentials: "include",
    });
    if (!res.ok) {
      const message = `notification markAsRead failed: ${res.status}`;
      console.error(message);
      throw new Error(message);
    }
    await Promise.all([
      mutate(),
      globalMutate("/api/notifications/unread-count"),
    ]);
  };

  const markAllAsRead = async () => {
    const res = await fetch("/api/notifications/read-all", {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) {
      const message = `notification markAllAsRead failed: ${res.status}`;
      console.error(message);
      throw new Error(message);
    }
    await Promise.all([
      mutate(),
      globalMutate("/api/notifications/unread-count"),
    ]);
  };

  const hasApiError = Boolean(data && !data.ok);
  const status: "loading" | "ready" | "error" = isLoading
    ? "loading"
    : error || hasApiError
      ? "error"
      : "ready";

  return {
    data,
    items: data?.ok ? data.items : [],
    unreadCount: data?.ok ? data.unreadCount : 0,
    hasMore: data?.ok ? data.hasMore : false,
    status,
    error,
    isLoading,
    mutate,
    markAsRead,
    markAllAsRead,
  };
}
