import { adminFetcher } from '@/lib/admin/adminFetcher';

export const fetchProductDetail = <T,>(url: string) => adminFetcher<T>(url, { cache: 'no-store' });
