export type AdminPackageType = '10회권' | '30회권' | '50회권' | '100회권';
export type AdminPackageServiceType = '방문' | '출장';
export type AdminPackagePassStatus = '비활성' | '활성' | '만료' | '취소';
export type AdminPackagePassStatusDetail = '대기' | '일시정지' | Exclude<AdminPackagePassStatus, '비활성'>;
export type AdminPackagePaymentStatus = '결제완료' | '결제대기' | '결제취소';

export interface AdminPackageCustomerDto {
  name?: string;
  email?: string;
  phone?: string;
}

export interface AdminPackageListItemDto {
  id: string;
  userId: string;
  customer: AdminPackageCustomerDto;
  packageType: AdminPackageType;
  totalSessions: number;
  remainingSessions: number;
  usedSessions: number;
  price: number;
  purchaseDate: string | null;
  expiryDate: string | null;
  passStatus: AdminPackagePassStatus | '대기';
  paymentStatus: AdminPackagePaymentStatus | string;
  serviceType: AdminPackageServiceType;
}

export interface AdminPackageMetricsDto {
  total: number;
  active: number;
  revenue: number;
  expirySoon: number;
}

export interface AdminPackageListResponseDto {
  items: AdminPackageListItemDto[];
  total: number;
  page: number;
  pageSize: number;
  metrics?: AdminPackageMetricsDto;
}

export interface AdminPackageOperationHistoryDto {
  id: string;
  date: string;
  extendedSessions?: number;
  extendedDays?: number;
  reason?: string;
  adminName?: string;
  adminEmail?: string;
  from?: string | null;
  to?: string | null;
  paymentStatus?: AdminPackagePaymentStatus | '취소';
  eventType?: 'extend_expiry' | 'adjust_sessions' | 'payment_status_change';
}

export interface AdminPackageUsageHistoryDto {
  id: string;
  applicationId: string;
  date: string;
  sessionsUsed: number;
  description: string;
  adminNote?: string;
}

export interface AdminPackageDetailDto {
  id: string;
  userId?: string;
  customer: Required<AdminPackageCustomerDto>;
  packageType: AdminPackageType;
  totalSessions: number;
  remainingSessions: number;
  usedSessions: number;
  price: number;
  purchaseDate: string;
  expiryDate: string;
  passStatus: AdminPackagePassStatusDetail;
  paymentStatus: AdminPackagePaymentStatus;
  serviceType: AdminPackageServiceType;
  usageHistory: AdminPackageUsageHistoryDto[];
  operationsHistory: AdminPackageOperationHistoryDto[];
  extensionHistory?: AdminPackageOperationHistoryDto[];
}
