import type { AdminDashboardMetricsResponseDto } from '@/types/admin/dashboard';
import type { DashboardMetricsAggregate } from './aggregate-transformer';

/** Responsibility: response DTO mapping only (aggregate -> transport DTO). */
export function mapDashboardMetricsResponse(aggregate: DashboardMetricsAggregate): AdminDashboardMetricsResponseDto {
  return aggregate;
}
