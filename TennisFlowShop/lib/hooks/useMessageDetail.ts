'use client';

import useSWR from 'swr';
import type { MessageDetail } from '@/lib/types/message';

type Res = { ok: true; item: MessageDetail } | { ok: false; error: string };

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((r) => r.json());

export function useMessageDetail(id: string | null, enabled: boolean) {
  const key = enabled && id ? `/api/messages/${id}` : null;
  const { data, error, isLoading, mutate } = useSWR<Res>(key, fetcher);

  const item = data && data.ok ? data.item : null;
  return { item, data, error, isLoading, mutate };
}
