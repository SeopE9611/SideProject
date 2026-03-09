'use client';

import useSWR from 'swr';
import { authenticatedSWRFetcher } from '@/lib/fetchers/authenticatedSWRFetcher';
import type { MessageDetail } from '@/lib/types/message';

type Res = { ok: true; item: MessageDetail } | { ok: false; error: string };

export function useMessageDetail(id: string | null, enabled: boolean) {
  const key = enabled && id ? `/api/messages/${id}` : null;
  const { data, error, isLoading, mutate } = useSWR<Res>(key, authenticatedSWRFetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  const item = data && data.ok ? data.item : null;
  return { item, data, error, isLoading, mutate };
}
