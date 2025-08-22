import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { verifyAccessToken } from '@/lib/auth.utils';

type DbAny = any;

// 인덱스: 이름이 달라도 같은 키면 생성 생략, 과거 user+service 유니크는 삭제
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

  // 조회 최적화: 상품 리뷰 집계/리스트용
  if (!hasKey({ productId: 1, status: 1, createdAt: -1 })) {
    await col.createIndex({ productId: 1, status: 1, createdAt: -1 }, { name: 'product_list_index' });
  }

  // 목록 공용 인덱스(상태 + 정렬 키)
  if (!hasKey({ status: 1, createdAt: -1, _id: -1 })) {
    await col.createIndex({ status: 1, createdAt: -1, _id: -1 }, { name: 'status_created_desc' });
  }
  if (!hasKey({ status: 1, helpfulCount: -1, _id: -1 })) {
    await col.createIndex({ status: 1, helpfulCount: -1, _id: -1 }, { name: 'status_helpful_desc' });
  }
  if (!hasKey({ status: 1, rating: -1, _id: -1 })) {
    await col.createIndex({ status: 1, rating: -1, _id: -1 }, { name: 'status_rating_desc' });
  }
}

// 상품 별점/리뷰수 집계 후 products 업데이트
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

  // 상품 리뷰
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
      productId: productIdObj, // 항상 ObjectId로 저장
      rating,
      content,
      photos,
      status: 'visible', // 기본값
      helpfulCount: 0, // 기본값
      userName: userName, // 표시용 스냅샷
      createdAt: now,
      updatedAt: now,
    });

    // 집계 반영
    await updateProductRatingSummary(db, productIdObj, productIdStr);

    return NextResponse.json({ ok: true }, { status: 201 });
  }

  // 서비스(스트링) 리뷰
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
      serviceApplicationId: appIdObj, // 항상 ObjectId로 저장
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

// 리뷰 리스트(상품/서비스) + 필터 + 커서 페이지네이션
export async function GET(req: Request) {
  const db = await getDb();
  await ensureReviewIndexes(db);

  // 사용자/권한 추출
  const token = (await cookies()).get('accessToken')?.value;
  let currentUserId: ObjectId | null = null;
  let isAdmin = false;
  if (token) {
    const payload = verifyAccessToken(token);
    if (payload?.sub) currentUserId = new ObjectId(String(payload.sub));
    isAdmin = (payload as any)?.role === 'admin' || (payload as any)?.role === 'ADMIN' || (payload as any)?.isAdmin === true || (Array.isArray((payload as any)?.roles) && (payload as any).roles.includes('admin'));
  }

  const url = new URL(req.url);
  const type = (url.searchParams.get('type') || 'all') as 'product' | 'service' | 'all';
  const rating = url.searchParams.get('rating');
  const hasPhoto = url.searchParams.get('hasPhoto') === '1';
  const sort = (url.searchParams.get('sort') || 'latest') as 'latest' | 'helpful' | 'rating';
  const limit = Math.max(1, Math.min(50, Number(url.searchParams.get('limit') || 10)));
  const cursorB64 = url.searchParams.get('cursor');
  const withHidden = url.searchParams.get('withHidden'); // 'mask' | 'all' | null

  // match 조건 구성
  const match: any = {};
  if (withHidden !== 'mask' && withHidden !== 'all') {
    match.status = 'visible';
  }
  if (type === 'product') match.productId = { $exists: true };
  if (type === 'service') match.service = { $exists: true };
  if (rating) match.rating = Number(rating);
  if (hasPhoto) match.$expr = { $gt: [{ $size: { $ifNull: ['$photos', []] } }, 0] };
  // 정렬 스펙 및 커서(다중 키) 구성
  const sortSpec: any = sort === 'helpful' ? { helpfulCount: -1, _id: -1 } : sort === 'rating' ? { rating: -1, _id: -1 } : { createdAt: -1, _id: -1 };

  // 커서 decoding
  let after: any = null;
  if (cursorB64) {
    try {
      after = JSON.parse(Buffer.from(cursorB64, 'base64').toString('utf-8'));
    } catch {}
  }

  // 커서 조건 생성: 정렬키 비교 ->  동률이면 _id 비교
  const cursorCond: any = {};
  if (after && after.id) {
    if (sort === 'helpful' && typeof after.helpfulCount === 'number') {
      cursorCond.$or = [{ helpfulCount: { $lt: after.helpfulCount } }, { helpfulCount: after.helpfulCount, _id: { $lt: new ObjectId(after.id) } }];
    } else if (sort === 'rating' && typeof after.rating === 'number') {
      cursorCond.$or = [{ rating: { $lt: after.rating } }, { rating: after.rating, _id: { $lt: new ObjectId(after.id) } }];
    } else if (after.createdAt) {
      cursorCond.$or = [{ createdAt: { $lt: new Date(after.createdAt) } }, { createdAt: new Date(after.createdAt), _id: { $lt: new ObjectId(after.id) } }];
    } else {
      cursorCond._id = { $lt: new ObjectId(after.id) };
    }
  }

  // $lookup으로 상품 표시 정보 붙이기
  const project: any = {
    _id: 1,
    type: { $cond: [{ $ifNull: ['$productId', false] }, 'product', 'service'] },
    productId: 1,
    productName: '$product.name',
    productImage: { $arrayElemAt: ['$product.images', 0] },
    service: 1,
    serviceApplicationId: 1,
    rating: 1,
    helpfulCount: 1,
    createdAt: 1,
    votedByMe: 1,
    status: 1,
    isMine: 1,
  };

  // withHidden=mask 인 경우에만 “비공개” 마스킹 처리
  project.status = 1; // 프런트 분기용
  project.ownedByMe = 1; // 내 리뷰만 메뉴를 노출
  if (withHidden === 'mask') {
    // status === 'hidden' 이면서 (본인X & 관리자X)인 경우만 마스킹
    const hiddenCond = {
      $and: [{ $eq: ['$status', 'hidden'] }, { $not: [{ $or: ['$ownedByMe', '$adminView'] }] }],
    };

    project.userName = { $cond: [hiddenCond, null, '$userName'] };
    project.content = { $cond: [hiddenCond, null, '$content'] };
    project.photos = { $cond: [hiddenCond, [], { $ifNull: ['$photos', []] }] };
    project.masked = hiddenCond; // 프런트 오버레이 분기
  } else {
    project.userName = '$userName';
    project.content = '$content';
    project.photos = { $ifNull: ['$photos', []] };
    project.masked = false;
  }
  // 파이프라인에서 기존 $project 블록을 아래로 교체
  const pipeline: any[] = [
    { $match: match },
    ...(Object.keys(cursorCond).length ? [{ $match: cursorCond }] : []),
    { $sort: sortSpec },
    { $limit: limit + 1 },
    {
      $lookup: {
        from: 'products',
        localField: 'productId',
        foreignField: '_id',
        as: 'product',
        pipeline: [{ $project: { name: 1, images: 1 } }],
      },
    },

    { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
    //  현재 로그인 사용자가 쓴 리뷰인지 여부를 서버에서 계산
    ...(currentUserId ? [{ $addFields: { isMine: { $eq: ['$userId', currentUserId] } } }] : [{ $addFields: { isMine: false } }]),
    //  alias + 관리자 뷰 플래그
    { $addFields: { ownedByMe: '$isMine', adminView: isAdmin } },
    { $project: project },
  ];

  if (currentUserId) {
    pipeline.push(
      {
        $lookup: {
          from: 'review_votes',
          let: { rid: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{ $eq: ['$reviewId', '$$rid'] }, { $eq: ['$userId', currentUserId] }],
                },
              },
            },
            { $limit: 1 },
          ],
          as: 'myVote',
        },
      },
      { $addFields: { votedByMe: { $gt: [{ $size: '$myVote' }, 0] } } },
      { $project: { myVote: 0 } }
    );
  } else {
    pipeline.push({ $addFields: { votedByMe: false } });
  }

  const rows = await db.collection('reviews').aggregate(pipeline).toArray();

  // nextCursor 생성
  let nextCursor: string | null = null;
  if (rows.length > limit) {
    const last = rows[limit - 1];
    rows.length = limit;
    const payload = sort === 'helpful' ? { id: String(last._id), helpfulCount: last.helpfulCount ?? 0 } : sort === 'rating' ? { id: String(last._id), rating: last.rating ?? 0 } : { id: String(last._id), createdAt: last.createdAt };
    nextCursor = Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64');
  }

  return NextResponse.json({ items: rows, nextCursor });
}
