import { useEffect, useRef } from 'react';
import type { ReadonlyURLSearchParams } from 'next/navigation';
import { getValidatedQueryParam } from '@/lib/admin/urlQuerySync';

export function useInitialYyyymmFromQuery(searchParams: ReadonlyURLSearchParams, setYyyymm: (yyyymm: string) => void) {
  const didInitFromQuery = useRef(false);

  useEffect(() => {
    if (didInitFromQuery.current) return;
    didInitFromQuery.current = true;

    const q = getValidatedQueryParam(searchParams, 'yyyymm', (value) => /^\d{6}$/.test(value));
    if (q) {
      setYyyymm(q);
    }
  }, [searchParams, setYyyymm]);
}
