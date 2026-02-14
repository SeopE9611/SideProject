import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin.guard';

export const dynamic = 'force-dynamic';

function withDeprecation(res: NextResponse) {
  res.headers.set('Deprecation', 'true');
  res.headers.set('Sunset', 'Wed, 31 Dec 2026 14:59:59 GMT');
  res.headers.set('Link', '</api/admin/settlements>; rel="successor-version"');
  return res;
}

export async function GET(req: Request) {
  // 정산 데이터는 민감 정보이므로 관리자만 조회 가능해야 함
  const g = await requireAdmin(req);
  if (!g.ok) return withDeprecation(g.res);

  const db = g.db;
  const rows = await db
    .collection('settlements')
    .find({}, { projection: { _id: 0 } })
    .sort({ yyyymm: -1 })
    .toArray();
  return withDeprecation(NextResponse.json(rows));
}
