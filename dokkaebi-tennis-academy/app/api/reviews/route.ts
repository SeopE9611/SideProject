import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { verifyAccessToken } from '@/lib/auth.utils';
import { grantPoints } from '@/lib/points.service';
import { REVIEW_REWARD_POINTS } from '@/lib/points.policy';

type DbAny = any;

/** ---- 이미지 화이트리스트 ----
 * 호스트/경로를 여기에 등록합니다.
 * 필요 시 여러 항목 추가 가능.
 */
const ALLOWED_HOSTS = new Set<string>(['cwzpxxahtayoyqqskmnt.supabase.co']);
const ALLOWED_PATH_PREFIXES = ['/storage/v1/object/public/tennis-images/'];

/** http/https + 화이트리스트(host, path) 체크 */
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

  //  기존 user+product 유니크가 있으면 제거 (주문 단위 유니크로 대체)
  for (const i of idxs) {
    if (i.unique && keyEq(i.key, { userId: 1, productId: 1 })) {
      try {
        await col.dropIndex(i.name);
      } catch {}
    }
  }

  // 상품: user + product + orderId 유니크 (주문 단위)
  if (!hasKey({ userId: 1, productId: 1, orderId: 1 })) {
    await col.createIndex(
      { userId: 1, productId: 1, orderId: 1 },
      {
        name: 'user_product_order_unique',
        unique: true,
        // 과거 문서(orderId 없음)는 인덱싱에서 제외 → 새 정책과 충돌 안 함
        partialFilterExpression: { productId: { $exists: true }, orderId: { $exists: true }, isDeleted: { $ne: true } },
      },
    );
  }

  // 서비스: user+service+serviceApplicationId 유니크
  if (!hasKey({ userId: 1, service: 1, serviceApplicationId: 1 })) {
    await col.createIndex({ userId: 1, service: 1, serviceApplicationId: 1 }, { name: 'user_service_application_unique', unique: true, partialFilterExpression: { serviceApplicationId: { $exists: true } } });
  }

  // 조회 최적화
  if (!hasKey({ productId: 1, status: 1, createdAt: -1 })) {
    await col.createIndex({ productId: 1, status: 1, createdAt: -1 }, { name: 'product_list_index' });
  }
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
        $or: [{ productId: productIdObj }, { productId: productIdStr }],
      },
    },
    { $group: { _id: null, avg: { $avg: '$rating' }, cnt: { $sum: 1 }, last: { $max: '$createdAt' } } },
  ]);

  const agg = await cursor.next();
  const products = db.collection('products');

  if (agg) {
    await products.updateOne({ _id: productIdObj }, { $set: { ratingAvg: Math.round(agg.avg * 10) / 10, ratingCount: agg.cnt, lastReviewAt: agg.last } });
  } else {
    await products.updateOne({ _id: productIdObj }, { $set: { ratingAvg: 0, ratingCount: 0 }, $unset: { lastReviewAt: '' } });
  }
}

export async function POST(req: Request) {
  const token = (await cookies()).get('accessToken')?.value;
  if (!token) return NextResponse.json({ message: 'unauthorized' }, { status: 401 });

  // 토큰 파손/만료로 verifyAccessToken이 throw 되어도 500이 아니라 401 처리
  let payload: any = null;
  try {
    payload = verifyAccessToken(token);
  } catch {
    payload = null;
  }
  const subStr = payload?.sub ? String(payload.sub) : '';
  if (!subStr || !ObjectId.isValid(subStr)) {
    return NextResponse.json({ message: 'unauthorized' }, { status: 401 });
  }
  const db = await getDb();
  await ensureReviewIndexes(db);

  // 깨진 JSON이면 throw → 500 방지
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: 'invalid_json' }, { status: 400 });
  }
  // orderId는 쿼리나 바디 어느 쪽으로 와도 받게 처리
  const url = new URL(req.url);
  const queryOrderId = url.searchParams.get('orderId');
  const orderIdRaw = body.orderId ?? queryOrderId ?? null;
  const orderIdObj = orderIdRaw && ObjectId.isValid(orderIdRaw) ? new ObjectId(orderIdRaw) : null;

  const userId = new ObjectId(subStr);

  // 유저 이름 스냅샷
  let userName: string | null = null;
  try {
    const user = await db.collection('users').findOne({ _id: userId }, { projection: { name: 1 } });
    userName = user?.name ?? null;
  } catch {}

  const rating = Number(body.rating);
  const content = String(body.content ?? '').trim();

  // 사진 정제 (화이트리스트)
  const photosInput = Array.isArray(body.photos) ? body.photos : [];
  const cleanedList = photosInput.filter(isAllowedHttpUrl).map((s: string) => s.trim());
  const photosClean = Array.from(new Set<string>(cleanedList)).slice(0, 5);

  if (!rating || rating < 1 || rating > 5) return NextResponse.json({ message: 'invalid rating' }, { status: 400 });
  if (!content) return NextResponse.json({ message: 'empty content' }, { status: 400 });

  // 상품 리뷰
  if (body.productId) {
    const productIdStr = String(body.productId);
    if (!ObjectId.isValid(productIdStr)) {
      return NextResponse.json({ message: 'invalid productId' }, { status: 400 });
    }
    const productIdObj = new ObjectId(productIdStr);

    // 구매 이력 검증: orderId가 넘어오면 해당 주문에 그 상품이 포함되어야 함
    let bought: any;
    if (orderIdObj) {
      bought = await db.collection('orders').findOne({ _id: orderIdObj, userId, 'items.productId': { $in: [productIdStr, productIdObj] } }, { projection: { _id: 1 } });
    } else {
      // orderId가 없으면 기존 로직(해당 상품을 구매한 주문이 하나라도 있으면 OK)
      bought = await db.collection('orders').findOne({ userId, 'items.productId': { $in: [productIdStr, productIdObj] } }, { projection: { _id: 1 } });
    }
    if (!bought) return NextResponse.json({ message: 'notPurchased' }, { status: 403 });

    // 중복 작성 방지 (주문 단위): 같은 주문 + 같은 상품 + 같은 유저
    const productCandidates = [productIdObj, productIdStr];
    const dupFilter: any = {
      userId,
      isDeleted: { $ne: true },
      productId: { $in: productCandidates },
    };
    // orderId가 있을 때만 주문 단위로 막기 (과거 orderId 없이 쓴 리뷰는 새 주문을 막지 않도록)
    if (orderIdObj) {
      dupFilter.orderId = { $in: [orderIdObj, orderIdRaw] };
    }
    const already = await db.collection('reviews').findOne(dupFilter);
    if (already) return NextResponse.json({ message: 'already' }, { status: 409 });

    const now = new Date();
    const doc: any = {
      userId,
      productId: productIdObj,
      rating,
      content,
      photos: photosClean,
      status: 'visible',
      helpfulCount: 0,
      userName,
      createdAt: now,
      updatedAt: now,
    };
    if (orderIdObj) doc.orderId = orderIdObj;

    const insertRes = await db.collection('reviews').insertOne(doc);
    const reviewId = insertRes.insertedId;

    // 포인트 적립 (보수적 시작)
    // - 결제완료 주문만 적립
    // - orderId가 없는 레거시 작성은 적립 제외(중복/어뷰징 리스크 최소화)
    if (orderIdObj) {
      const paidOrder = await db.collection('orders').findOne({ _id: orderIdObj, userId, paymentStatus: '결제완료' }, { projection: { _id: 1 } });
      if (paidOrder) {
        try {
          await grantPoints(db, {
            userId,
            amount: REVIEW_REWARD_POINTS,
            type: 'review_reward_product',
            status: 'confirmed',
            refKey: `review:${reviewId.toString()}`,
            ref: { reviewId, orderId: orderIdObj },
            reason: '상품 리뷰 작성 적립',
          });
        } catch (e) {
          // 포인트 적립은 "부가 동작"이므로, 리뷰 생성 자체를 실패시키지 않음
          console.error('[reviews] grantPoints failed (product)', e);
        }
      }
    }

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
    const app = await db.collection('stringing_applications').findOne({ _id: appIdObj }, { projection: { userId: 1, orderId: 1 } });
    if (!app || String(app.userId) !== String(userId)) {
      return NextResponse.json({ message: 'forbidden' }, { status: 403 });
    }

    // 신청서 단위 중복 작성 방지
    const already = await db.collection('reviews').findOne({
      userId,
      service: 'stringing',
      $or: [{ serviceApplicationId: appIdObj }, { serviceApplicationId: appIdStr }],
    });
    if (already) return NextResponse.json({ message: 'already' }, { status: 409 });

    const now = new Date();
    const insertRes = await db.collection('reviews').insertOne({
      userId,
      service: 'stringing',
      serviceApplicationId: appIdObj,
      rating,
      content,
      photos: photosClean,
      status: 'visible',
      helpfulCount: 0,
      userName,
      createdAt: now,
      updatedAt: now,
    });
    const reviewId = insertRes.insertedId;

    // 포인트 적립 (보수적 시작)
    // - 결제완료 주문이 연결된 신청서만 적립
    const appOrderId = (app as any)?.orderId;
    if (appOrderId && ObjectId.isValid(String(appOrderId))) {
      const paidOrder = await db.collection('orders').findOne({ _id: new ObjectId(String(appOrderId)), userId, paymentStatus: '결제완료' }, { projection: { _id: 1 } });
      if (paidOrder) {
        try {
          await grantPoints(db, {
            userId,
            amount: REVIEW_REWARD_POINTS,
            type: 'review_reward_service',
            status: 'confirmed',
            refKey: `review:${reviewId.toString()}`,
            ref: { reviewId, orderId: new ObjectId(String(appOrderId)) },
            reason: '서비스 리뷰 작성 적립',
          });
        } catch (e) {
          console.error('[reviews] grantPoints failed (service)', e);
        }
      }
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  }

  return NextResponse.json({ message: 'bad request' }, { status: 400 });
}

// 리뷰 리스트(상품/서비스) + 필터 + 커서 페이지네이션
function toInt(v: string | null, fallback: number, min: number, max: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  const i = Math.trunc(n);
  return Math.min(max, Math.max(min, i));
}

export async function GET(req: Request) {
  const db = await getDb();
  await ensureReviewIndexes(db);

  // 사용자/권한 추출
  const token = (await cookies()).get('accessToken')?.value;
  let currentUserId: ObjectId | null = null;
  let isAdmin = false;
  if (token) {
    // 토큰 파손/만료로 verifyAccessToken이 throw 되어도 500 방지 (비로그인 취급)
    let payload: any = null;
    try {
      payload = verifyAccessToken(token);
    } catch {
      payload = null;
    }
    const subStr = payload?.sub ? String(payload.sub) : '';
    if (subStr && ObjectId.isValid(subStr)) {
      currentUserId = new ObjectId(subStr);
    }
    isAdmin = (payload as any)?.role === 'admin' || (payload as any)?.role === 'ADMIN' || (payload as any)?.isAdmin === true || (Array.isArray((payload as any)?.roles) && (payload as any).roles.includes('admin'));
  }

  const url = new URL(req.url);
  const type = (url.searchParams.get('type') || 'all') as 'product' | 'service' | 'all';
  const rating = url.searchParams.get('rating');
  const hasPhoto = url.searchParams.get('hasPhoto') === '1';
  const sort = (url.searchParams.get('sort') || 'latest') as 'latest' | 'helpful' | 'rating';
  const limit = toInt(url.searchParams.get('limit'), 10, 1, 50);
  const cursorB64 = url.searchParams.get('cursor');
  const withHidden = url.searchParams.get('withHidden'); // 'mask' | 'all' | null
  const withDeleted = url.searchParams.get('withDeleted'); //  ('1' | 'true')
  const needServiceJoin = type === 'all' || type === 'service';

  // match 조건 구성
  const match: any = {};
  // 공개 기본: 소프트 삭제 제외
  match.isDeleted = { $ne: true };
  // 관리자 + withDeleted=1 이면 삭제 포함
  if (isAdmin && (withDeleted === '1' || withDeleted === 'true')) {
    delete match.isDeleted;
  }
  if (withHidden !== 'mask' && withHidden !== 'all') match.status = 'visible';
  if (type === 'product') match.productId = { $exists: true };
  if (type === 'service') match.service = { $exists: true };
  if (rating) match.rating = Number(rating);
  if (hasPhoto) match.$expr = { $gt: [{ $size: { $ifNull: ['$photos', []] } }, 0] };

  // 정렬/커서
  const sortSpec: any = sort === 'helpful' ? { helpfulCount: -1, _id: -1 } : sort === 'rating' ? { rating: -1, _id: -1 } : { createdAt: -1, _id: -1 };

  let after: any = null;
  if (cursorB64) {
    try {
      after = JSON.parse(Buffer.from(cursorB64, 'base64').toString('utf-8'));
    } catch {}
  }

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
    serviceTitle: 1,
    serviceTargetName: 1,
    rating: 1,
    helpfulCount: 1,
    createdAt: 1,
    votedByMe: 1,
    status: 1,
    isMine: 1,
  };

  project.status = 1;
  project.ownedByMe = 1;
  if (withHidden === 'mask') {
    const hiddenCond = { $and: [{ $eq: ['$status', 'hidden'] }, { $not: [{ $or: ['$ownedByMe', '$adminView'] }] }] };
    project.userName = { $cond: [hiddenCond, null, '$userName'] };
    project.content = { $cond: [hiddenCond, null, '$content'] };
    project.photos = { $cond: [hiddenCond, [], { $ifNull: ['$photos', []] }] };
    project.masked = hiddenCond;
  } else {
    project.userName = '$userName';
    project.content = '$content';
    project.photos = { $ifNull: ['$photos', []] };
    project.masked = false;
  }

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
    ...(needServiceJoin
      ? [
          // 서비스(스트링 교체) 리뷰면 신청서에서 "교체한 스트링 상품명"을 가져와서 제목을 만들어줌
          {
            $lookup: {
              from: 'stringing_applications',
              localField: 'serviceApplicationId',
              foreignField: '_id',
              as: 'application',
              pipeline: [
                {
                  $project: {
                    // 스키마가 케이스별로 다를 수 있어서 후보를 넓게 잡음
                    'stringDetails.stringItems.name': 1,
                    'stringItems.name': 1,
                    stringTypes: 1,
                  },
                },
              ],
            },
          },
          { $unwind: { path: '$application', preserveNullAndEmptyArrays: true } },

          // 1) 신청서에서 스트링 이름 배열 뽑기
          {
            $addFields: {
              __svcNames: {
                $let: {
                  vars: {
                    fromItems: { $ifNull: ['$application.stringDetails.stringItems', []] },
                    fromLines: { $ifNull: ['$application.stringDetails.racketLines', []] },
                  },
                  in: {
                    $cond: [{ $gt: [{ $size: '$$fromItems' }, 0] }, { $map: { input: '$$fromItems', as: 'x', in: '$$x.name' } }, { $map: { input: '$$fromLines', as: 'x', in: '$$x.stringName' } }],
                  },
                },
              },
            },
          },
          // 2) 빈 값 제거
          {
            $addFields: {
              __svcNames: {
                $filter: {
                  input: '$__svcNames',
                  as: 'n',
                  cond: { $and: [{ $ne: ['$$n', null] }, { $ne: ['$$n', ''] }] },
                },
              },
            },
          },
          // 3) "앞 2개 + 외 N" 라벨 만들기
          {
            $addFields: {
              serviceTargetName: {
                $let: {
                  vars: {
                    names: '$__svcNames',
                    head: { $slice: ['$__svcNames', 2] },
                    more: { $max: [0, { $subtract: [{ $size: '$__svcNames' }, 2] }] },
                  },
                  in: {
                    $cond: [
                      { $gt: [{ $size: '$$names' }, 0] },
                      {
                        $cond: [
                          { $gt: ['$$more', 0] },
                          {
                            $concat: [
                              {
                                $reduce: {
                                  input: '$$head',
                                  initialValue: '',
                                  in: {
                                    $concat: ['$$value', { $cond: [{ $eq: ['$$value', ''] }, '', ', '] }, '$$this'],
                                  },
                                },
                              },
                              ' 외 ',
                              { $toString: '$$more' },
                            ],
                          },
                          {
                            $reduce: {
                              input: '$$names',
                              initialValue: '',
                              in: { $concat: ['$$value', { $cond: [{ $eq: ['$$value', ''] }, '', ', '] }, '$$this'] },
                            },
                          },
                        ],
                      },
                      null,
                    ],
                  },
                },
              },
            },
          },
          // 4) 최종 타이틀: "스트링 교체 서비스 - (상품명…)" 구성
          {
            $addFields: {
              serviceTitle: {
                $cond: [
                  { $eq: ['$service', 'stringing'] },
                  {
                    $cond: [{ $and: [{ $ne: ['$serviceTargetName', null] }, { $ne: ['$serviceTargetName', ''] }] }, { $concat: ['스트링 교체 서비스 - ', '$serviceTargetName'] }, '스트링 교체 서비스'],
                  },
                  null,
                ],
              },
            },
          },
        ]
      : []),
    ...(currentUserId ? [{ $addFields: { isMine: { $eq: ['$userId', currentUserId] } } }] : [{ $addFields: { isMine: false } }]),
    { $addFields: { ownedByMe: '$isMine', adminView: isAdmin } },
    { $project: project },
  ];

  if (currentUserId) {
    pipeline.push(
      {
        $lookup: {
          from: 'review_votes',
          let: { rid: '$_id' },
          pipeline: [{ $match: { $expr: { $and: [{ $eq: ['$reviewId', '$$rid'] }, { $eq: ['$userId', currentUserId] }] } } }, { $limit: 1 }],
          as: 'myVote',
        },
      },
      { $addFields: { votedByMe: { $gt: [{ $size: '$myVote' }, 0] } } },
      { $project: { myVote: 0 } },
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
