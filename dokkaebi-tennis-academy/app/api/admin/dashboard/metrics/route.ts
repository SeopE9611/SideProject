import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin.guard';
import { collectDashboardMetrics } from './_core/query-collector';
import { transformDashboardMetrics } from './_core/aggregate-transformer';
import { mapDashboardMetricsResponse } from './_core/response-mapper';

export async function GET(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;

  const raw = await collectDashboardMetrics(guard.db);
  const aggregate = transformDashboardMetrics(raw.payload);
  const dto = mapDashboardMetricsResponse(aggregate);

  return NextResponse.json(dto, { headers: raw.headers });
}
