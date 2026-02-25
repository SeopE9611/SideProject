import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getDb } from '@/lib/mongodb';
import { requireAdmin } from '@/lib/admin.guard';
import type { AdminReviewListItemDto, AdminReviewsListResponseDto } from '@/types/admin/reviews';

function parseIntParam(v: string | null, opts: { defaultValue: number; min: number; max: number }) {
  const n = Number(v);
  const base = Number.isFinite(n) ? n : opts.defaultValue;
  return Math.min(opts.max, Math.max(opts.min, Math.trunc(base)));
}

const querySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  status: z.enum(['all', 'visible', 'hidden']).default('all'),
  type: z.enum(['all', 'product', 'service']).default('all'),
  q: z.string().trim().default(''),
  withDeleted: z.enum(['0', '1', 'false', 'true']).optional(),
});

export async function GET(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;

  const url = new URL(req.url);
  const parsed = querySchema.parse({
    page: parseIntParam(url.searchParams.get('page'), { defaultValue: 1, min: 1, max: 10_000 }),
    limit: parseIntParam(url.searchParams.get('limit'), { defaultValue: 10, min: 1, max: 50 }),
    status: url.searchParams.get('status') ?? 'all',
    type: url.searchParams.get('type') ?? 'all',
    q: url.searchParams.get('q') ?? '',
    withDeleted: url.searchParams.get('withDeleted') ?? undefined,
  });

  const db = await getDb();
  const col = db.collection('reviews');

  const match: Record<string, unknown> = { isDeleted: { $ne: true } };
  if (parsed.withDeleted === '1' || parsed.withDeleted === 'true') {
    delete match.isDeleted;
  }
  if (parsed.status !== 'all') match.status = parsed.status;
  if (parsed.q) match.content = { $regex: parsed.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };

  if (parsed.type === 'product') {
    match.$or = [{ type: 'product' }, { productId: { $exists: true } }, { product_id: { $exists: true } }];
  } else if (parsed.type === 'service') {
    match.$or = [{ type: 'service' }, { $and: [{ productId: { $exists: false } }, { product_id: { $exists: false } }] }];
  }

  const pipeline: Record<string, unknown>[] = [
    { $match: match },
    { $sort: { createdAt: -1 } },
    { $skip: (parsed.page - 1) * parsed.limit },
    { $limit: parsed.limit },
    { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: '_user' } },
    { $lookup: { from: 'products', localField: 'productId', foreignField: '_id', as: '_product' } },
    {
      $addFields: {
        hasProductId: { $or: [{ $ne: [{ $ifNull: ['$productId', null] }, null] }, { $ne: [{ $ifNull: ['$product_id', null] }, null] }] },
        resolvedUserEmail: { $ifNull: ['$userEmail', { $arrayElemAt: ['$_user.email', 0] }] },
        resolvedUserName: { $ifNull: [{ $arrayElemAt: ['$_user.name', 0] }, ''] },
        contentStr: { $cond: [{ $eq: [{ $type: '$content' }, 'string'] }, '$content', ''] },
        createdAtSafe: { $ifNull: ['$createdAt', '$$NOW'] },
        helpfulCount: { $ifNull: ['$helpfulCount', 0] },
      },
    },
    {
      $addFields: {
        resolvedType: { $cond: [{ $in: ['$type', ['product', 'service']] }, '$type', { $cond: ['$hasProductId', 'product', 'service'] }] },
      },
    },
    {
      $addFields: {
        productNameResolved: { $ifNull: [{ $arrayElemAt: ['$_product.nameKo', 0] }, { $ifNull: [{ $arrayElemAt: ['$_product.name', 0] }, { $ifNull: [{ $arrayElemAt: ['$_product.title', 0] }, '$productName'] }] }] },
        subjectResolved: {
          $cond: [{ $or: [{ $eq: ['$resolvedType', 'product'] }, '$hasProductId'] }, { $ifNull: ['$subject', { $ifNull: ['$productNameResolved', '상품 리뷰'] }] }, { $ifNull: ['$subject', '서비스 리뷰'] }],
        },
      },
    },
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

  const shaped: AdminReviewListItemDto[] = items.map((d) => ({
    _id: String(d._id),
    type: d.type === 'service' ? 'service' : 'product',
    subject: typeof d.subject === 'string' ? d.subject : '',
    rating: Number(d.rating ?? 0),
    status: d.status === 'hidden' ? 'hidden' : 'visible',
    content: typeof d.content === 'string' ? d.content : '',
    createdAt: new Date(d.createdAt).toISOString(),
    userEmail: typeof d.userEmail === 'string' ? d.userEmail : undefined,
    userName: typeof d.userName === 'string' ? d.userName : undefined,
    helpfulCount: Number(d.helpfulCount ?? 0),
    photos: Array.isArray(d.photosPreview) ? d.photosPreview.filter((p): p is string => typeof p === 'string') : [],
    isDeleted: !!d.isDeleted,
  }));

  const response: AdminReviewsListResponseDto = { items: shaped, total };
  return NextResponse.json(response);
}
