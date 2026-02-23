import { adminFetcher } from '@/lib/admin/adminFetcher';
import type { AdminPackageDetailDto, AdminPackageListItemDto, AdminPackageListResponseDto, AdminPackageMetricsDto, AdminPackagePassStatus, AdminPackagePaymentStatus, AdminPackageServiceType, AdminPackageType } from '@/types/admin/packages';

export type PackageOrder = AdminPackageDetailDto;

export type PackageType = AdminPackageType;
export type ServiceType = AdminPackageServiceType;
export type PassStatus = AdminPackagePassStatus;
export type PaymentStatus = AdminPackagePaymentStatus;
export type SortKey = 'customer' | 'purchaseDate' | 'expiryDate' | 'remainingSessions' | 'price' | 'status' | 'payment' | 'package' | 'progress';

export const PASS_STATUS_LABELS: Record<PassStatus, string> = {
  비활성: '비활성',
  활성: '활성',
  만료: '만료',
  취소: '취소',
};

export const packageStatusColors: Record<PassStatus | '대기', string> = {
  비활성: 'bg-muted text-primary border-border',
  활성: 'bg-success/10 text-success border-border',
  만료: 'bg-background text-foreground border-border',
  취소: 'bg-destructive/10 text-destructive border-destructive/30 dark:bg-destructive/15',
  대기: 'bg-background text-foreground border-border',
};

export type PackageListItem = AdminPackageListItemDto;

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type PackageMetrics = AdminPackageMetricsDto;

export type PackagesResponse = AdminPackageListResponseDto;

export const badgeSizeCls = 'px-2.5 py-0.5 text-xs leading-[1.05] rounded-md';

export const paymentStatusColors: Record<PaymentStatus, string> = {
  결제완료: 'bg-primary/10 text-primary border-border',
  결제대기: 'bg-warning/10 text-warning border-border',
  결제취소: 'bg-destructive/10 text-destructive border-destructive/30 dark:bg-destructive/15',
};

export const packageTypeColors: Record<PackageType, string> = {
  '10회권': 'bg-muted text-foreground border-border',
  '30회권': 'bg-primary/10 text-primary border-border',
  '50회권': 'bg-success/10 text-success border-border',
  '100회권': 'bg-warning/10 text-warning border-border',
};

export const fetcher = adminFetcher;

export const DEFAULT_PACKAGE_LIST_FILTERS = {
  page: 1 as number,
  limit: 10 as number,
  status: 'all' as 'all' | PassStatus,
  package: 'all' as 'all' | PackageType,
  payment: 'all' as 'all' | PaymentStatus,
  service: 'all' as 'all' | ServiceType,
  sortBy: null as SortKey | null,
  sortDirection: 'asc' as 'asc' | 'desc',
  q: '' as string,
};
