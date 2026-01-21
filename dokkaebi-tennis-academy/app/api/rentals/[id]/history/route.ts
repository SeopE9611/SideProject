export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth.utils';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    // (1) 관리자 가드 (토큰 불량 throw → 500 방지)
    const jar = await cookies();
    const at = jar.get('accessToken')?.value;
    let payload: any = null;
    try {
      payload = at ? verifyAccessToken(at) : null;
    } catch {
      payload = null;
    }
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ ok: false, message: 'UNAUTHORIZED' }, { status: 401 });
    }

    // (2) id(ObjectId) 유효성 (new ObjectId(id) throw → 500 방지)
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ ok: false, message: 'BAD_ID' }, { status: 400 });
    }
    const rentalId = new ObjectId(id);

    // 페이징 파라미터
    const url = new URL(req.url);
    const pageRaw = parseInt(url.searchParams.get('page') || '1', 10);
    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
    const pageSizeRaw = parseInt(url.searchParams.get('pageSize') || '10', 10);
    const pageSize = Number.isFinite(pageSizeRaw) ? Math.min(50, Math.max(5, pageSizeRaw)) : 10;
    const skip = (page - 1) * pageSize;

    const db = (await clientPromise).db();
    const filter = { rentalId };

    // total + 페이지 데이터 (최신순)
    const [total, items] = await Promise.all([db.collection('rental_history').countDocuments(filter), db.collection('rental_history').find(filter).sort({ at: -1 }).skip(skip).limit(pageSize).toArray()]);

    const hasNext = page * pageSize < total;
    const hasPrev = page > 1;

    return NextResponse.json({ ok: true, page, pageSize, total, hasNext, hasPrev, items });
  } catch (e) {
    console.error('history list error', e);
    return NextResponse.json({ ok: false, message: 'SERVER_ERROR' }, { status: 500 });
  }
}
