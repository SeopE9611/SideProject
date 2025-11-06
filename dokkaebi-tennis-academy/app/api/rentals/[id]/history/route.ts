export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth.utils';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    //관리자 가드
    const jar = await cookies();
    const at = jar.get('accessToken')?.value;
    const payload = at ? verifyAccessToken(at) : null;
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ ok: false, message: 'UNAUTHORIZED' }, { status: 401 });
    }

    // 페이징 파라미터
    const url = new URL(req.url);
    const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
    const pageSize = Math.min(50, Math.max(5, Number(url.searchParams.get('pageSize') ?? 10)));
    const skip = (page - 1) * pageSize;

    const db = (await clientPromise).db();
    const filter = { rentalId: new ObjectId(id) };

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
