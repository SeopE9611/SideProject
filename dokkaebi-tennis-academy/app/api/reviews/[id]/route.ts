import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { verifyAccessToken } from '@/lib/auth.utils';

type DbAny = any;

// 상품 별점/리뷰수 집계 보정 (status:'visible'만 집계)
async function updateProductRatingSummary(db: DbAny, productId: ObjectId) {
  const col = db.collection('reviews');
  const cursor = col.aggregate([{ $match: { status: 'visible', productId } }, { $group: { _id: null, avg: { $avg: '$rating' }, cnt: { $sum: 1 } } }]);
  const agg = await cursor.next();
  const products = db.collection('products');
  if (agg) {
    await products.updateOne({ _id: productId }, { $set: { ratingAvg: Math.round(agg.avg * 10) / 10, ratingCount: agg.cnt } });
  } else {
    await products.updateOne({ _id: productId }, { $set: { ratingAvg: 0, ratingCount: 0 } });
  }
}

// 수정: 내용/별점/공개여부
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ message: 'invalid id' }, { status: 400 });

  const token = (await cookies()).get('accessToken')?.value;
  const payload = token ? verifyAccessToken(token) : null;
  if (!payload?.sub) return NextResponse.json({ message: 'unauthorized' }, { status: 401 });

  const db = await getDb();
  const _id = new ObjectId(id);

  const me = new ObjectId(String(payload.sub));
  const doc = await db.collection('reviews').findOne({ _id, isDeleted: { $ne: true } }, { projection: { userId: 1, productId: 1 } });
  if (!doc || String(doc.userId) !== String(me)) return NextResponse.json({ message: 'forbidden' }, { status: 403 });

  const body = await req.json();
  const $set: any = { updatedAt: new Date() };

  if (typeof body.content === 'string') $set.content = body.content.trim();
  if (typeof body.rating === 'number') $set.rating = Math.max(1, Math.min(5, body.rating));
  if (body.status === 'visible' || body.status === 'hidden') $set.status = body.status;

  if (Object.keys($set).length === 1) return NextResponse.json({ message: 'no changes' }, { status: 400 });

  await db.collection('reviews').updateOne({ _id }, { $set });

  // 상품 집계 갱신 (상품 리뷰이고 rating/status가 변경된 경우)
  if (doc.productId && (body.rating !== undefined || body.status)) {
    await updateProductRatingSummary(db, doc.productId);
  }

  return NextResponse.json({ ok: true });
}

// 삭제: 소프트 삭제 + 집계 보정
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ message: 'invalid id' }, { status: 400 });

  const token = (await cookies()).get('accessToken')?.value;
  const payload = token ? verifyAccessToken(token) : null;
  if (!payload?.sub) return NextResponse.json({ message: 'unauthorized' }, { status: 401 });

  const db = await getDb();
  const _id = new ObjectId(id);
  const me = new ObjectId(String(payload.sub));

  const doc = await db.collection('reviews').findOne({ _id, isDeleted: { $ne: true } }, { projection: { userId: 1, productId: 1 } });
  if (!doc || String(doc.userId) !== String(me)) return NextResponse.json({ message: 'forbidden' }, { status: 403 });

  await db.collection('reviews').updateOne({ _id }, { $set: { isDeleted: true, deletedAt: new Date(), status: 'hidden' } });

  if (doc.productId) await updateProductRatingSummary(db, doc.productId);

  return NextResponse.json({ ok: true });
}
