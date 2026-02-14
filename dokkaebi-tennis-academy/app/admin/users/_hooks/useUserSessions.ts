'use client';
import useSWR from 'swr';

type SessionItem = { at: string; ip: string; ua: string; os: string; browser: string; isMobile: boolean };

const fetcher = (url: string) => fetch(url, { credentials: 'include', cache: 'no-store' }).then((r) => {
  if (!r.ok) throw new Error('불러오기 실패');
  return r.json();
});

export function useUserSessions(userId: string, limit = 5) {
  return useSWR<{ items: SessionItem[] }>(`/api/admin/users/${userId}/sessions?limit=${limit}`, fetcher);
}
