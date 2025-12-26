import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { verifyAccessToken } from '@/lib/auth.utils';
import { deductPoints } from '@/lib/points.service';
import { z } from 'zod';

type DbAny = any;

/** ---- 이미지 화이트리스트 ---- */
const ALLOWED_HOSTS = new Set<string>(['cwzpxxahtayoyqqskmnt.supabase.co']);
const ALLOWED_PATH_PREFIXES = ['/storage/v1/object/public/tennis-images/'];

const isAllowedHttpUrl = (v: unknown): v is string => {
  if (typeof v !== 'string') return false;
  try {
    const { protocol, hostname, pathname } = new URL(v);
    const okProto = protocol === 'https:' || protocol === 'http:';
    const okHost = ALLOWED_HOSTS.size ? ALLOWED_HOSTS.has(hostname) : true;
    const okPath = ALLOWED_PATH_PREFIXES.length ? ALLOWED_PATH_PREFIXES.some((p) => pathname.startsWith(p)) : true;
    return okProto && okHost && okPath;
  } catch {
    return false;
  }
};

// 상품 별점/리뷰수 집계 보정 (status:'visible'만 집계)
async function updateProductRatingSummary(db: DbAny, productId: ObjectId) {
  const col = db.collection('reviews');
  const cursor = col.aggregate([{ $match: { status: 'visible', isDeleted: { $ne: true }, productId } }, { $group: { _id: null, avg: { $avg: '$rating' }, cnt: { $sum: 1 } } }]);
  const agg = await cursor.next();
  const products = db.collection('products');
  if (agg) {
    await products.updateOne({ _id: productId }, { $set: { ratingAvg: Math.round(agg.avg * 10) / 10, ratingCount: agg.cnt } });
  } else {
    await products.updateOne({ _id: productId }, { $set: { ratingAvg: 0, ratingCount: 0 } });
  }
}

// 수정: 내용/별점/공개여부/사진
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ message: 'invalid id' }, { status: 400 });

  const token = (await cookies()).get('accessToken')?.value;
  const payload = token ? verifyAccessToken(token) : null;
  if (!payload?.sub) return NextResponse.json({ message: 'unauthorized' }, { status: 401 });

  const db = await getDb();
  const _id = new ObjectId(id);

  const me = new ObjectId(String(payload.sub));
  const role = payload?.role;

  const doc = await db.collection('reviews').findOne({ _id, isDeleted: { $ne: true } }, { projection: { userId: 1, productId: 1, status: 1 } });
  if (!doc) return NextResponse.json({ message: 'not found' }, { status: 404 });

  const isOwner = String(doc.userId) === String(me);
  const isAdmin = role === 'admin' || role === 'ADMIN' || (payload as any)?.isAdmin === true || (Array.isArray((payload as any)?.roles) && (payload as any).roles.includes('admin'));

  if (!isOwner && !isAdmin) return NextResponse.json({ message: 'forbidden' }, { status: 403 });

  const PatchSchema = z.object({
    content: z.string().trim().min(5, '내용은 5자 이상').max(2000, '2000자 이내').optional(),
    rating: z.number().int().min(1).max(5).optional(),
    status: z.enum(['visible', 'hidden']).optional(),
    visibility: z.enum(['public', 'private']).optional(),
    photos: z.array(z.string()).max(5).optional(),
  });

  const body = PatchSchema.parse(await req.json());
  if (!('content' in body) && !('rating' in body) && !('status' in body) && !('photos' in body)) {
    return NextResponse.json({ message: 'no changes' }, { status: 400 });
  }

  const $set: any = { updatedAt: new Date() };

  if (typeof body.content === 'string') $set.content = body.content.trim();
  if (typeof body.rating === 'number') $set.rating = Math.max(1, Math.min(5, body.rating));
  if (body.status === 'visible' || body.status === 'hidden') $set.status = body.status;
  if (body.visibility) {
    $set.status = body.visibility === 'public' ? 'visible' : 'hidden';
  }
  if (Array.isArray(body.photos)) {
    const cleanedList = body.photos.filter(isAllowedHttpUrl).map((s: string) => s.trim());
    $set.photos = Array.from(new Set<string>(cleanedList)).slice(0, 5);
  }

  if (Object.keys($set).length === 1) return NextResponse.json({ message: 'no changes' }, { status: 400 });

  await db.collection('reviews').updateOne({ _id }, { $set });

  // 상품 집계 갱신
  if (doc.productId && (body.rating !== undefined || body.status)) {
    await updateProductRatingSummary(db, doc.productId);
  }

  return NextResponse.json({ ok: true });
}

// 삭제: 소프트 삭제 + 집계 보정
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ message: 'invalid id' }, { status: 400 });

  const token = (await cookies()).get('accessToken')?.value;
  const payload = token ? verifyAccessToken(token) : null;
  if (!payload?.sub) return NextResponse.json({ message: 'unauthorized' }, { status: 401 });

  const db = await getDb();
  const _id = new ObjectId(id);
  const me = new ObjectId(String(payload.sub));

  const doc = await db.collection('reviews').findOne({ _id, isDeleted: { $ne: true } }, { projection: { userId: 1, productId: 1 } });
  if (!doc) return NextResponse.json({ message: 'not found' }, { status: 404 });

  const isOwner = String(doc.userId) === String(me);
  const isAdmin = payload?.role === 'admin';
  if (!isOwner && !isAdmin) return NextResponse.json({ message: 'forbidden' }, { status: 403 });

  await db.collection('reviews').updateOne({ _id }, { $set: { isDeleted: true, deletedAt: new Date(), status: 'hidden' } });

  // 리뷰 적립 포인트 회수 (가능하면 자동 처리)
  // - 이미 사용한 포인트 때문에 잔액이 부족할 수 있으므로 allowNegativeBalance=true로 회수 우선 반영
  // - 포인트 원장(points_transactions)에 해당 적립이 없으면(레거시/정책상 미지급) 아무것도 하지 않음
  try {
    // 리뷰 적립 트랜잭션 refKey 규칙과 반드시 일치해야 함
    // (POST /api/reviews에서 동일한 refKey로 적립됨)
    const earnRefKey = `review:${id}`;
    const earned = await db.collection('points_transactions').findOne(
      {
        userId: doc.userId,
        status: 'confirmed',
        type: { $in: ['review_reward_product', 'review_reward_service'] },
        $or: [{ refKey: earnRefKey }, { 'ref.reviewId': _id }],
      },
      { projection: { amount: 1, type: 1, refKey: 1 } }
    );

    if (earned && typeof (earned as any).amount === 'number' && (earned as any).amount > 0) {
      await deductPoints(db, {
        userId: doc.userId,
        amount: Number((earned as any).amount),
        type: (earned as any).type,
        status: 'confirmed',
        refKey: `${earnRefKey}:revoke`,
        ref: { reviewId: _id },
        reason: '리뷰 삭제로 인한 적립 회수',
        allowNegativeBalance: true,
      });
    }
  } catch (e) {
    console.error('[reviews] deductPoints failed (delete)', e);
  }

  if (doc.productId) await updateProductRatingSummary(db, doc.productId);

  return NextResponse.json({ ok: true });
}

// 단건 상세(관리자/작성자 허용)
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ message: 'invalid id' }, { status: 400 });

  const token = (await cookies()).get('accessToken')?.value;
  const payload = token ? verifyAccessToken(token) : null;
  if (!payload?.sub) return NextResponse.json({ message: 'unauthorized' }, { status: 401 });

  const db = await getDb();
  const _id = new ObjectId(id);

  const review = await db.collection('reviews').findOne({ _id, isDeleted: { $ne: true } }, { projection: { userId: 1, productId: 1, rating: 1, status: 1, content: 1, createdAt: 1, helpfulCount: 1, photos: 1 } });
  if (!review) return NextResponse.json({ message: 'not found' }, { status: 404 });

  const me = String(payload.sub);
  const isOwner = String(review.userId) === me;
  const isAdmin = payload?.role === 'admin' || payload?.role === 'ADMIN' || (payload as any)?.isAdmin === true || (Array.isArray((payload as any)?.roles) && (payload as any).roles.includes('admin'));
  if (!isOwner && !isAdmin) return NextResponse.json({ message: 'forbidden' }, { status: 403 });

  const user = await db.collection('users').findOne({ _id: review.userId }, { projection: { name: 1, email: 1 } });

  return NextResponse.json({
    _id: String(review._id),
    rating: review.rating ?? 0,
    status: review.status === 'hidden' ? 'hidden' : 'visible',
    content: review.content ?? '',
    createdAt: review.createdAt ?? new Date(),
    helpfulCount: review.helpfulCount ?? 0,
    photos: Array.isArray(review.photos) ? review.photos : [],
    userName: user?.name ?? '',
    userEmail: user?.email ?? '',
  });
}
