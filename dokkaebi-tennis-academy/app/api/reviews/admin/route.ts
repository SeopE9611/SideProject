import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';
import { verifyAccessToken } from '@/lib/auth.utils';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const productId = url.searchParams.get('productId');
    // limit 파싱: NaN이면 Mongo limit 단계에서 터질 수 있으므로 정수/클램프 처리
    const limitRaw = parseInt(url.searchParams.get('limit') || '50', 10);
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(100, limitRaw)) : 50;

    if (!productId) {
      return NextResponse.json({ error: 'productId required' }, { status: 400 });
    }

    // 인증 + 관리자 권한 확인
    const token = (await cookies()).get('accessToken')?.value;
    // verifyAccessToken이 만료/파손 토큰에서 throw 되어도 500이 아니라 "관리자 아님" 처리
    let payload: any = null;
    try {
      payload = token ? verifyAccessToken(token) : null;
    } catch {
      payload = null;
    }

    const isAdmin = !!payload && ((payload as any)?.role === 'admin' || (payload as any)?.role === 'ADMIN' || (payload as any)?.isAdmin === true || (Array.isArray((payload as any)?.roles) && (payload as any).roles.includes('admin')));

    if (!isAdmin) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const client = await clientPromise;
    const db = client.db();

    // 문자열/ObjectId 혼용 대비
    const candidates: (string | ObjectId)[] = [productId];
    if (ObjectId.isValid(productId)) candidates.push(new ObjectId(productId));

    const items = await db
      .collection('reviews')
      .find(
        {
          isDeleted: { $ne: true },
          $or: [{ productId: { $in: candidates } }, { 'target.productId': { $in: candidates } }],
        },
        {
          projection: {
            _id: 1,
            rating: 1,
            createdAt: 1,
            status: 1, // 'hidden'이라도 관리자는 원문 확인
            userName: 1,
            content: 1,
            photos: 1,
          },
          sort: { createdAt: -1 },
          limit,
        },
      )
      .toArray();

    const out = items.map((r) => ({
      _id: String(r._id),
      rating: r.rating,
      createdAt: r.createdAt,
      status: r.status,
      userName: r.userName,
      content: r.content,
      photos: r.photos ?? [],
      masked: false, // 관리자 뷰에서는 마스킹 해제
      adminView: true,
    }));

    return NextResponse.json(out, {
      headers: { 'Cache-Control': 'no-store', Vary: 'Cookie' },
    });
  } catch (e) {
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
