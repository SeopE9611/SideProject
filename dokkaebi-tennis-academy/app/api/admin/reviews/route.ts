import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { requireAdmin } from '@/lib/admin.guard';

function parseIntParam(v: string | null, opts: { defaultValue: number; min: number; max: number }) {
  const n = Number(v);
  const base = Number.isFinite(n) ? n : opts.defaultValue;
  return Math.min(opts.max, Math.max(opts.min, Math.trunc(base)));
}

export async function GET(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;

  const url = new URL(req.url);
  const page = parseIntParam(url.searchParams.get('page'), { defaultValue: 1, min: 1, max: 10_000 });
  const limit = parseIntParam(url.searchParams.get('limit'), { defaultValue: 10, min: 1, max: 50 });
  const status = url.searchParams.get('status'); // visible|hidden
  const type = url.searchParams.get('type'); // product|service
  const q = (url.searchParams.get('q') || '').trim();
  const withDeleted = url.searchParams.get('withDeleted'); // '1' | 'true'

  const db = await getDb();
  const col = db.collection('reviews');

  const match: any = { isDeleted: { $ne: true } };
  // 관리자: withDeleted=1 이면 삭제 포함
  if (withDeleted === '1' || withDeleted === 'true') {
    delete match.isDeleted;
  }
  if (status === 'visible' || status === 'hidden') match.status = status;
  if (q) match.content = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };

  // 타입 필터(명시적 type 없을 때 productId/서비스 단서로 유추)
  if (type === 'product') {
    match.$or = [{ type: 'product' }, { productId: { $exists: true } }, { product_id: { $exists: true } }];
  } else if (type === 'service') {
    match.$or = [
      { type: 'service' },
      // productId가 없으면 service로 간주(서비스용 id가 따로 없어도 통과)
      { $and: [{ productId: { $exists: false } }, { product_id: { $exists: false } }] },
    ];
  }

  const pipeline: any[] = [
    { $match: match },
    { $sort: { createdAt: -1 } },
    { $skip: (page - 1) * limit },
    { $limit: limit },

    // 작성자/상품 조인
    { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: '_user' } },
    { $lookup: { from: 'products', localField: 'productId', foreignField: '_id', as: '_product' } },

    // 기초 필드
    {
      $addFields: {
        hasProductId: {
          $or: [{ $ne: [{ $ifNull: ['$productId', null] }, null] }, { $ne: [{ $ifNull: ['$product_id', null] }, null] }],
        },
        resolvedUserEmail: { $ifNull: ['$userEmail', { $arrayElemAt: ['$_user.email', 0] }] },
        resolvedUserName: { $ifNull: [{ $arrayElemAt: ['$_user.name', 0] }, ''] },
        contentStr: { $cond: [{ $eq: [{ $type: '$content' }, 'string'] }, '$content', ''] },
        createdAtSafe: { $ifNull: ['$createdAt', '$$NOW'] },
        helpfulCount: { $ifNull: ['$helpfulCount', 0] },
      },
    },

    // hasProductId를 이용해 type 확정
    {
      $addFields: {
        resolvedType: {
          $cond: [{ $in: ['$type', ['product', 'service']] }, '$type', { $cond: ['$hasProductId', 'product', 'service'] }],
        },
      },
    },

    // 제품명/리뷰 대상
    {
      $addFields: {
        productNameResolved: {
          $ifNull: [{ $arrayElemAt: ['$_product.nameKo', 0] }, { $ifNull: [{ $arrayElemAt: ['$_product.name', 0] }, { $ifNull: [{ $arrayElemAt: ['$_product.title', 0] }, '$productName'] }] }],
        },
        subjectResolved: {
          $cond: [{ $or: [{ $eq: ['$resolvedType', 'product'] }, '$hasProductId'] }, { $ifNull: ['$subject', { $ifNull: ['$productNameResolved', '상품 리뷰'] }] }, { $ifNull: ['$subject', '서비스 리뷰'] }],
        },
      },
    },

    // 최종 투영
    {
      $project: {
        _id: 1,
        type: '$resolvedType',
        subject: '$subjectResolved',
        rating: { $ifNull: ['$rating', 0] },
        status: { $cond: [{ $eq: ['$status', 'hidden'] }, 'hidden', 'visible'] },
        content: { $substrCP: ['$contentStr', 0, 200] },
        createdAt: '$createdAtSafe',
        userEmail: '$resolvedUserEmail',
        userName: '$resolvedUserName',
        helpfulCount: 1,
        photosPreview: { $slice: [{ $ifNull: ['$photos', []] }, 4] },
        isDeleted: { $toBool: { $ifNull: ['$isDeleted', false] } },
      },
    },
  ];

  const [items, total] = await Promise.all([col.aggregate(pipeline).toArray(), col.countDocuments(match)]);

  const shaped = items.map((d: any) => ({
    _id: String(d._id),
    type: d.type, // 'product' | 'service'
    subject: d.subject, // 모달/리스트의 "리뷰 대상"
    rating: d.rating,
    status: d.status, // 'visible' | 'hidden'
    content: d.content,
    createdAt: new Date(d.createdAt).toISOString(),
    userEmail: d.userEmail,
    userName: d.userName,
    helpfulCount: d.helpfulCount ?? 0,
    photos: d.photosPreview ?? [],
    isDeleted: !!d.isDeleted,
  }));

  return NextResponse.json({ items: shaped, total });
}
