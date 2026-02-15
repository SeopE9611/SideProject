'use client';
import useSWR from 'swr';
import { adminFetcher } from '@/lib/admin/adminFetcher';

type SessionItem = { at: string; ip: string; ua: string; os: string; browser: string; isMobile: boolean };

export function useUserSessions(userId: string, limit = 5) {
  return useSWR<{ items: SessionItem[] }>(`/api/admin/users/${userId}/sessions?limit=${limit}`, (url: string) => adminFetcher<{ items: SessionItem[] }>(url, { cache: 'no-store' }));
}
