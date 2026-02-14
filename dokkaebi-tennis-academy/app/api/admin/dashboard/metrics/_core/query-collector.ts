import { getDashboardMetrics } from './getDashboardMetrics';

/** Responsibility: query collection only (DB 접근 진입점). */
export async function collectDashboardMetrics(db: any) {
  return getDashboardMetrics(db);
}
