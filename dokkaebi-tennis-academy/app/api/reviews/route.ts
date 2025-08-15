// app/api/reviews/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { verifyAccessToken } from '@/lib/auth.utils';

type DbAny = any;

// --- 인덱스: 이름이 달라도 같은 키면 생성 생략, 과거 user+service 유니크는 삭제
async function ensureReviewIndexes(db: DbAny) {
  const col = db.collection('reviews');
  const idxs = await col
    .listIndexes()
    .toArray()
    .catch(() => []);

  const keyEq = (a: Record<string, number>, b: Record<string, number>) => {
    const ak = Object.keys(a);
    const bk = Object.keys(b);
    if (ak.length !== bk.length) return false;
    return ak.every((k, i) => k === bk[i] && a[k] === b[k]);
  };
  const hasKey = (key: Record<string, number>) => idxs.some((i: any) => keyEq(i.key, key));

  // 기존 user+service (사용자당 1회) 유니크는 제거
  for (const i of idxs) {
    if (i.unique && keyEq(i.key, { userId: 1, service: 1 })) {
      try {
        await col.dropIndex(i.name);
      } catch {}
    }
  }

  // 상품: user+product 유니크
  if (!hasKey({ userId: 1, productId: 1 })) {
    await col.createIndex(
      { userId: 1, productId: 1 },
      {
        name: 'user_product_unique',
        unique: true,
        partialFilterExpression: { productId: { $exists: true } },
      }
    );
  }

  // 서비스: user+service+serviceApplicationId 유니크
  if (!hasKey({ userId: 1, service: 1, serviceApplicationId: 1 })) {
    await col.createIndex(
      { userId: 1, service: 1, serviceApplicationId: 1 },
      {
        name: 'user_service_application_unique',
        unique: true,
        partialFilterExpression: { serviceApplicationId: { $exists: true } },
      }
    );
  }

  // 조회 최적화(선택): 상품 리뷰 집계/리스트용
  if (!hasKey({ productId: 1, status: 1, createdAt: -1 })) {
    await col.createIndex({ productId: 1, status: 1, createdAt: -1 }, { name: 'product_list_index' });
  }
}

// --- 상품 별점/리뷰수 집계 후 products 업데이트
async function updateProductRatingSummary(db: DbAny, productIdObj: ObjectId, productIdStr: string) {
  const col = db.collection('reviews');

  const cursor = col.aggregate([
    {
      $match: {
        status: 'visible',
        $or: [
          { productId: productIdObj },
          { productId: productIdStr }, // 과거 문자열 레코드도 집계 포함 (이행기간)
        ],
      },
    },
    {
      $group: {
        _id: null,
        avg: { $avg: '$rating' },
        cnt: { $sum: 1 },
        last: { $max: '$createdAt' },
      },
    },
  ]);

  const agg = await cursor.next();
  const products = db.collection('products');

  if (agg) {
    await products.updateOne(
      { _id: productIdObj },
      {
        $set: {
          ratingAvg: Math.round(agg.avg * 10) / 10,
          ratingCount: agg.cnt,
          lastReviewAt: agg.last,
        },
      }
    );
  } else {
    // 리뷰가 0개면 0으로 초기화
    await products.updateOne({ _id: productIdObj }, { $set: { ratingAvg: 0, ratingCount: 0 }, $unset: { lastReviewAt: '' } });
  }
}

export async function POST(req: Request) {
  const token = (await cookies()).get('accessToken')?.value;
  if (!token) return NextResponse.json({ message: 'unauthorized' }, { status: 401 });
  const payload = verifyAccessToken(token);
  if (!payload) return NextResponse.json({ message: 'unauthorized' }, { status: 401 });

  const db = await getDb();
  await ensureReviewIndexes(db);

  const body = await req.json();
  const userId = new ObjectId(payload.sub);

  // 유저 이름 스냅샷 (표시에 쓰는 값)
  let userName: string | null = null;
  try {
    const user = await db.collection('users').findOne({ _id: userId }, { projection: { name: 1 } });
    userName = user?.name ?? null;
  } catch {}

  const rating = Number(body.rating);
  const content = String(body.content ?? '').trim();
  const photos = Array.isArray(body.photos) ? body.photos : [];
  if (!rating || rating < 1 || rating > 5) return NextResponse.json({ message: 'invalid rating' }, { status: 400 });
  if (!content) return NextResponse.json({ message: 'empty content' }, { status: 400 });

  // ===== (A) 상품 리뷰 =====
  if (body.productId) {
    const productIdStr = String(body.productId);
    if (!ObjectId.isValid(productIdStr)) {
      return NextResponse.json({ message: 'invalid productId' }, { status: 400 });
    }
    const productIdObj = new ObjectId(productIdStr);

    // 구매 이력(문자열/객체형 둘 다 커버)
    const bought = await db.collection('orders').findOne({ userId, 'items.productId': { $in: [productIdStr, productIdObj] } }, { projection: { _id: 1 } });
    if (!bought) return NextResponse.json({ message: 'notPurchased' }, { status: 403 });

    // 이미 작성했는지(혼종 방지)
    const already = await db.collection('reviews').findOne({
      userId,
      $or: [{ productId: productIdObj }, { productId: productIdStr }],
    });
    if (already) return NextResponse.json({ message: 'already' }, { status: 409 });

    const now = new Date();
    await db.collection('reviews').insertOne({
      userId,
      productId: productIdObj, // ★ 항상 ObjectId로 저장
      rating,
      content,
      photos,
      status: 'visible', // ★ 기본값
      helpfulCount: 0, // ★ 기본값
      userName: userName, // ★ 표시용 스냅샷
      createdAt: now,
      updatedAt: now,
    });

    // 집계 반영
    await updateProductRatingSummary(db, productIdObj, productIdStr);

    return NextResponse.json({ ok: true }, { status: 201 });
  }

  // ===== (B) 서비스(스트링) 리뷰 =====
  if (body.service) {
    if (body.service !== 'stringing') return NextResponse.json({ message: 'unknown service' }, { status: 400 });

    const appIdStr = String(body.serviceApplicationId || '');
    if (!ObjectId.isValid(appIdStr)) {
      return NextResponse.json({ message: 'serviceApplicationId required' }, { status: 400 });
    }
    const appIdObj = new ObjectId(appIdStr);

    // 소유권 검증
    const app = await db.collection('stringing_applications').findOne({ _id: appIdObj }, { projection: { userId: 1 } });
    if (!app || String(app.userId) !== String(userId)) {
      return NextResponse.json({ message: 'forbidden' }, { status: 403 });
    }

    // 신청서 단위 중복 작성 방지(혼종 대비)
    const already = await db.collection('reviews').findOne({
      userId,
      service: 'stringing',
      $or: [{ serviceApplicationId: appIdObj }, { serviceApplicationId: appIdStr }],
    });
    if (already) return NextResponse.json({ message: 'already' }, { status: 409 });

    const now = new Date();
    await db.collection('reviews').insertOne({
      userId,
      service: 'stringing',
      serviceApplicationId: appIdObj, // ★ 항상 ObjectId로 저장
      rating,
      content,
      photos,
      status: 'visible',
      helpfulCount: 0,
      userName: userName,
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  }

  return NextResponse.json({ message: 'bad request' }, { status: 400 });
}
