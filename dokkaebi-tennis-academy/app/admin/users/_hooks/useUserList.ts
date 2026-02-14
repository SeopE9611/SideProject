'use client';
import useSWR from 'swr';

export type UserListFilters = {
  page: number;
  limit: number;
  searchQuery: string;
  roleFilter: 'all' | 'user' | 'admin';
  statusFilter: 'all' | 'active' | 'deleted' | 'suspended';
  loginFilter: 'all' | 'nologin' | 'recent30' | 'recent90';
  signupFilter: 'all' | 'local' | 'kakao' | 'naver';
  sort: 'created_desc' | 'created_asc' | 'name_asc' | 'name_desc';
};

export type UserListItem = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  addressDetail?: string;
  postalCode?: string;
  role: 'user' | 'admin';
  isDeleted: boolean;
  createdAt?: string;
  lastLoginAt?: string;
  isSuspended?: boolean;
  socialProviders?: Array<'kakao' | 'naver'>;
};

const fetcher = (url: string) => fetch(url, { credentials: 'include', cache: 'no-store' }).then((r) => {
  if (!r.ok) throw new Error('불러오기 실패');
  return r.json();
});

export function useUserList(filters: UserListFilters) {
  const p = new URLSearchParams({ page: String(filters.page), limit: String(filters.limit) });
  if (filters.searchQuery.trim()) p.set('q', filters.searchQuery.trim());
  if (filters.roleFilter !== 'all') p.set('role', filters.roleFilter);
  if (filters.statusFilter !== 'all') p.set('status', filters.statusFilter);
  if (filters.loginFilter !== 'all') p.set('login', filters.loginFilter);
  if (filters.signupFilter !== 'all') p.set('signup', filters.signupFilter);
  if (filters.sort) p.set('sort', filters.sort);

  const key = `/api/admin/users?${p.toString()}`;
  const swr = useSWR(key, fetcher);

  return {
    ...swr,
    rows: (swr.data?.items as UserListItem[]) ?? [],
    total: Number(swr.data?.total ?? 0),
  };
}
