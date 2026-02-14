import type { DashboardMetrics } from '@/types/admin/dashboard';

export type DashboardMetricsAggregate = DashboardMetrics;

/** Responsibility: aggregation transform only (raw query result -> aggregate model). */
export function transformDashboardMetrics(raw: DashboardMetrics): DashboardMetricsAggregate {
  return {
    ...raw,
    generatedAt: raw.generatedAt || new Date().toISOString(),
  };
}
