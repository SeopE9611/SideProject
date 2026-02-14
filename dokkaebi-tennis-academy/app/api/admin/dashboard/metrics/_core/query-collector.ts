import type { Db } from 'mongodb';
import { getDashboardMetrics } from './getDashboardMetrics';
import type { DashboardMetrics } from '@/types/admin/dashboard';

export interface DashboardMetricsQueryResult {
  payload: DashboardMetrics;
  headers?: HeadersInit;
}

/** Responsibility: query collection only (DB 접근 진입점). */
export async function collectDashboardMetrics(db: Db): Promise<DashboardMetricsQueryResult> {
  return getDashboardMetrics(db);
}
