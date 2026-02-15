'use client';
import useSWR from 'swr';
import { buildQueryString } from '@/lib/admin/urlQuerySync';
import { adminFetcher } from '@/lib/admin/adminFetcher';

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

type UserListResponse = {
  items?: UserListItem[];
  total?: number;
};

export function useUserList(filters: UserListFilters) {
  const queryString = buildQueryString({
    page: filters.page,
    limit: filters.limit,
    q: filters.searchQuery.trim(),
    role: filters.roleFilter,
    status: filters.statusFilter,
    login: filters.loginFilter,
    signup: filters.signupFilter,
    sort: filters.sort,
  });

  const key = `/api/admin/users?${queryString}`;
  const swr = useSWR<UserListResponse>(key, (url: string) => adminFetcher<UserListResponse>(url, { cache: 'no-store' }));

  return {
    ...swr,
    rows: (swr.data?.items as UserListItem[]) ?? [],
    total: Number(swr.data?.total ?? 0),
  };
}
