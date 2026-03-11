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

  // 조회 실패/미확정 상태를 실제 빈 목록(0개)과 혼동하지 않기 위해 상태를 분리한다.
  const hasResolvedData = Boolean(data && data.ok);
  const hasDataError = Boolean(error) || Boolean(data && !data.ok);

  const items = data?.ok ? data.items : null;
  const total = data?.ok ? data.total : null;
  const errorMessage = data && !data.ok ? data.error : null;

  return { items, total, data, error, errorMessage, hasResolvedData, hasDataError, isLoading, mutate, key };
}
