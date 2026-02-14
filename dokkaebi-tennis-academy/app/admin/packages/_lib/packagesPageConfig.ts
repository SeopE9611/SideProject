export interface PackageOrder {
  id: string;
  userId?: string;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  packageType: '10회권' | '30회권' | '50회권' | '100회권';
  totalSessions: number;
  remainingSessions: number;
  usedSessions: number;
  price: number;
  purchaseDate: string;
  expiryDate: string;
  status: '활성' | '만료' | '일시정지' | '취소';
  paymentStatus: '결제완료' | '결제대기' | '결제취소';
  serviceType: '방문' | '출장';
}

export type PackageType = '10회권' | '30회권' | '50회권' | '100회권';
export type ServiceType = '방문' | '출장';
export type PassStatus = '비활성' | '활성' | '만료' | '취소';
export type PaymentStatus = '결제완료' | '결제대기' | '결제취소';
export type SortKey = 'customer' | 'purchaseDate' | 'expiryDate' | 'remainingSessions' | 'price' | 'status' | 'payment' | 'package' | 'progress';

export const PASS_STATUS_LABELS: Record<PassStatus, string> = {
  비활성: '비활성',
  활성: '활성',
  만료: '만료',
  취소: '취소',
};

export const packageStatusColors: Record<PassStatus | '대기', string> = {
  비활성: 'bg-amber-100 text-amber-800 border-amber-200',
  활성: 'bg-green-100 text-green-800 border-green-200',
  만료: 'bg-gray-100 text-gray-800 border-gray-200',
  취소: 'bg-red-100 text-red-800 border-red-200',
  대기: 'bg-slate-100 text-slate-700 border-slate-200',
};

export interface PackageListItem {
  id: string;
  userId: string;
  customer: { name?: string; email?: string; phone?: string };
  packageType: PackageType;
  totalSessions: number;
  remainingSessions: number;
  usedSessions: number;
  price: number;
  purchaseDate: string | null;
  expiryDate: string | null;
  passStatus: PassStatus | '대기';
  paymentStatus: PaymentStatus | string;
  serviceType: ServiceType;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PackageMetrics {
  total: number;
  active: number;
  revenue: number;
  expirySoon: number;
}

export type PackagesResponse = Paginated<PackageListItem> & {
  metrics?: PackageMetrics;
};

export const badgeSizeCls = 'px-2.5 py-0.5 text-xs leading-[1.05] rounded-md';

export const paymentStatusColors: Record<PaymentStatus, string> = {
  결제완료: 'bg-blue-100 text-blue-800 border-blue-200',
  결제대기: 'bg-orange-100 text-orange-800 border-orange-200',
  결제취소: 'bg-red-100 text-red-800 border-red-200',
};

export const packageTypeColors: Record<PackageType, string> = {
  '10회권': 'bg-purple-100 text-purple-800 border-purple-200',
  '30회권': 'bg-blue-100 text-blue-800 border-blue-200',
  '50회권': 'bg-green-100 text-green-800 border-green-200',
  '100회권': 'bg-orange-100 text-orange-800 border-orange-200',
};

export const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((res) => res.json());

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
