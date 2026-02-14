import type { Db } from 'mongodb';
import { getDashboardMetrics } from './getDashboardMetrics';

/** Responsibility: query collection only (DB 접근 진입점). */
export async function collectDashboardMetrics(db: Db) {
  return getDashboardMetrics(db);
}
