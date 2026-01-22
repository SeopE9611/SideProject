import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { requireAdmin } from '@/lib/admin.guard';

export const dynamic = 'force-dynamic';

export async function GET() {
  // 정산 데이터는 민감 정보이므로 관리자만 조회 가능해야 함
  const g = await requireAdmin(new Request('http://local/'));
  if (!g.ok) return g.res;
  
  const db = await getDb();
  const rows = await db
    .collection('settlements')
    .find({}, { projection: { _id: 0 } })
    .sort({ yyyymm: -1 })
    .toArray();
  return NextResponse.json(rows);
}
