'use client';

import useSWR from 'swr';

type UnreadCountRes = { ok: true; count: number } | { ok: false; error: string };

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((r) => r.json());

// 상단 네비게이션의 'N(새 쪽지)' 뱃지를 위해 미열람 개수를 가볍게 폴링
export function useUnreadMessageCount(enabled: boolean) {
  const { data, error, isLoading, mutate } = useSWR<UnreadCountRes>(enabled ? '/api/messages/unread-count' : null, fetcher, {
    dedupingInterval: 10_000,
    refreshInterval: 30_000,
    revalidateOnFocus: true,
  });

  const count = data && data.ok ? data.count : 0;
  return { count, data, error, isLoading, mutate };
}
