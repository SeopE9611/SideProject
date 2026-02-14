'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReadonlyURLSearchParams } from 'next/navigation';
import { buildQueryString, replaceQueryUrl } from '@/lib/admin/urlQuerySync';

type ReplaceFn = (url: string, options?: { scroll?: boolean }) => void;

interface UseAdminListQueryStateOptions<TState extends { page: number }> {
  pathname: string;
  searchParams: ReadonlyURLSearchParams;
  replace: ReplaceFn;
  defaults: TState;
  parse: (sp: URLSearchParams, defaults: TState) => TState;
  toQueryParams: (state: TState) => Record<string, string | number | boolean | null | undefined>;
  pageResetKeys: (keyof TState)[];
}

function shallowEqual<T extends Record<string, unknown>>(a: T, b: T) {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    if (a[key] !== b[key]) return false;
  }
  return true;
}

export function useAdminListQueryState<TState extends { page: number }>({
  pathname,
  searchParams,
  replace,
  defaults,
  parse,
  toQueryParams,
  pageResetKeys,
}: UseAdminListQueryStateOptions<TState>) {
  const [state, setState] = useState<TState>(defaults);
  const initializedRef = useRef(false);

  useEffect(() => {
    const parsed = parse(new URLSearchParams(searchParams.toString()), defaults);
    setState((prev) => (shallowEqual(prev as Record<string, unknown>, parsed as Record<string, unknown>) ? prev : parsed));
    initializedRef.current = true;
  }, [defaults, parse, searchParams]);

  useEffect(() => {
    if (!initializedRef.current) return;
    const queryString = buildQueryString(toQueryParams(state));
    const currentQueryString = searchParams.toString();
    if (queryString === currentQueryString) return;
    replaceQueryUrl(pathname, queryString, (url) => replace(url, { scroll: false }));
  }, [pathname, replace, searchParams, state, toQueryParams]);

  const patchState = useCallback(
    (patch: Partial<TState>) => {
      setState((prev) => {
        const next = { ...prev, ...patch } as TState;
        const includesPage = Object.prototype.hasOwnProperty.call(patch, 'page');
        if (!includesPage && pageResetKeys.some((key) => prev[key] !== next[key])) {
          next.page = 1;
        }
        return shallowEqual(prev as Record<string, unknown>, next as Record<string, unknown>) ? prev : next;
      });
    },
    [pageResetKeys]
  );

  return useMemo(
    () => ({
      state,
      patchState,
      setPage: (page: number) => patchState({ page } as Partial<TState>),
      setState,
    }),
    [patchState, state]
  );
}
