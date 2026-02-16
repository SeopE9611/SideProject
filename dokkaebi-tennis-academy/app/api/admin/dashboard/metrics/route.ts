import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin.guard';
import { collectDashboardMetrics } from './_core/query-collector';
import { transformDashboardMetrics } from './_core/aggregate-transformer';
import { mapDashboardMetricsResponse } from './_core/response-mapper';
import type { AdminDashboardMetricsResponseDto } from '@/types/admin/dashboard';
import { enforceAdminRateLimit } from '@/lib/admin/adminRateLimit';
import { ADMIN_EXPENSIVE_ENDPOINT_POLICIES } from '@/lib/admin/adminEndpointCostPolicy';

export async function GET(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;

  // 대시보드 메트릭은 다중 집계를 수행하므로 관리자 단위로 호출 빈도를 제한한다.
  const limited = await enforceAdminRateLimit(req, guard.db, String(guard.admin._id), ADMIN_EXPENSIVE_ENDPOINT_POLICIES.adminDashboardMetrics);
  if (limited) return limited;

  const raw = await collectDashboardMetrics(guard.db);
  const aggregate = transformDashboardMetrics(raw.payload);
  const dto: AdminDashboardMetricsResponseDto = mapDashboardMetricsResponse(aggregate);

  return NextResponse.json(dto, { headers: raw.headers });
}
