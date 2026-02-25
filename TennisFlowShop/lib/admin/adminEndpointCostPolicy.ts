export type AdminEndpointCostGrade = 'high' | 'critical';

export type AdminEndpointCostPolicy = {
  /** 운영 대시보드/로그 집계를 위한 고유 키 */
  endpointKey: string;
  /** 사람이 읽는 분류 라벨 */
  category: string;
  /** 비용 등급 */
  costGrade: AdminEndpointCostGrade;
  /** 슬라이딩 윈도우(ms) */
  windowMs: number;
  /** 윈도우 내 허용 요청 수 */
  maxRequests: number;
};

/**
 * 비용이 큰 관리자 API 분류표.
 * - 요구사항 대상: admin/system/*, settlements/*, admin/operations, admin/dashboard/metrics
 * - endpointKey는 레이트리밋/모니터링에서 공통 식별자로 사용한다.
 */
export const ADMIN_EXPENSIVE_ENDPOINT_POLICIES = {
  adminSystemPreview: {
    endpointKey: 'admin.system.preview',
    category: 'system-maintenance-read',
    costGrade: 'high',
    windowMs: 60_000,
    maxRequests: 20,
  },
  adminSystemMutation: {
    endpointKey: 'admin.system.mutation',
    category: 'system-maintenance-write',
    costGrade: 'critical',
    windowMs: 60_000,
    maxRequests: 6,
  },
  adminOperationsList: {
    endpointKey: 'admin.operations.list',
    category: 'operations-observability',
    costGrade: 'high',
    windowMs: 60_000,
    maxRequests: 30,
  },
  adminDashboardMetrics: {
    endpointKey: 'admin.dashboard.metrics',
    category: 'dashboard-analytics',
    costGrade: 'high',
    windowMs: 60_000,
    maxRequests: 30,
  },
  settlementsRead: {
    endpointKey: 'admin.settlements.read',
    category: 'settlement-read',
    costGrade: 'high',
    windowMs: 60_000,
    maxRequests: 20,
  },
  settlementsMutation: {
    endpointKey: 'admin.settlements.mutation',
    category: 'settlement-write',
    costGrade: 'critical',
    windowMs: 60_000,
    maxRequests: 8,
  },
} satisfies Record<string, AdminEndpointCostPolicy>;

export type AdminExpensiveEndpointPolicyKey = keyof typeof ADMIN_EXPENSIVE_ENDPOINT_POLICIES;
