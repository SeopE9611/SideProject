"use client";
import useSWR from "swr";
import { buildQueryString } from "@/lib/admin/urlQuerySync";
import { authenticatedSWRFetcher } from "@/lib/fetchers/authenticatedSWRFetcher";

export type UserListFilters = {
  page: number;
  limit: number;
  searchQuery: string;
  roleFilter: "all" | "user" | "admin";
  statusFilter: "all" | "active" | "deleted" | "suspended";
  loginFilter: "all" | "nologin" | "recent30" | "recent90";
  signupFilter: "all" | "local" | "kakao" | "naver";
  sort: "created_desc" | "created_asc" | "name_asc" | "name_desc";
};

export type UserListItem = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  addressDetail?: string;
  postalCode?: string;
  role: "user" | "admin";
  isDeleted: boolean;
  createdAt?: string;
  lastLoginAt?: string;
  isSuspended?: boolean;
  socialProviders?: Array<"kakao" | "naver">;
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
  const swr = useSWR<UserListResponse>(key, authenticatedSWRFetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  // 로딩/실패/실데이터를 소비처에서 명확히 분기할 수 있도록 상태를 분리한다.
  // - 실패/미확정 상태를 rows=[]/total=0으로 숨기지 않는다.
  const hasDataError = Boolean(swr.error);
  const hasResolvedData = Boolean(swr.data) && !hasDataError;

  // 데이터가 확정된 경우에만 rows/total을 노출한다.
  const rows = hasResolvedData
    ? ((Array.isArray(swr.data?.items) ? swr.data.items : []) as UserListItem[])
    : null;
  const totalValue = swr.data?.total;
  const total =
    hasResolvedData &&
    typeof totalValue === "number" &&
    Number.isFinite(totalValue)
      ? totalValue
      : null;

  const errorMessage = swr.error instanceof Error ? swr.error.message : null;

  return {
    ...swr,
    rows,
    total,
    hasResolvedData,
    hasDataError,
    errorMessage,
  };
}
