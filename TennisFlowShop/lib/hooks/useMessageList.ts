'use client';

import useSWR from 'swr';
import { authenticatedSWRFetcher } from '@/lib/fetchers/authenticatedSWRFetcher';
import type { MessageListItem } from '@/lib/types/message';

type Res = { ok: true; items: MessageListItem[]; total: number; page: number; limit: number } | { ok: false; error: string };

export function useMessageList(box: 'inbox' | 'send' | 'admin', page: number, limit: number, enabled: boolean) {
  const key = enabled ? `/api/messages/${box}?page=${page}&limit=${limit}` : null;
  const { data, error, isLoading, mutate } = useSWR<Res>(key, authenticatedSWRFetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  const items = data && data.ok ? data.items : [];
  const total = data && data.ok ? data.total : 0;

  return { items, total, data, error, isLoading, mutate, key };
}
