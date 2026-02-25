import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { requireAdmin } from '@/lib/admin.guard';

export async function GET(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;

  const db = await getDb();
  const col = db.collection('reviews');

  const agg = await col
    .aggregate([
      { $match: { isDeleted: { $ne: true } } },
      {
        $addFields: {
          // 문자열/객체형/레거시 키까지 폭넓게 인식
          _pidStr: { $toString: { $ifNull: ['$productId', '$product_id'] } },
          hasProductId: {
            $or: [
              { $ne: [{ $ifNull: ['$productId', null] }, null] },
              { $ne: [{ $ifNull: ['$product_id', null] }, null] },
              // 24자 헥사 문자열도 유효한 productId로 간주
              { $regexMatch: { input: { $toString: { $ifNull: ['$productId', '$product_id'] } }, regex: /^[a-fA-F0-9]{24}$/ } },
            ],
          },
          hasServiceMarker: {
            $or: [{ $ne: [{ $ifNull: ['$serviceApplicationId', null] }, null] }, { $in: ['$service', ['stringing']] }],
          },
          // type이 명시되고 값이 정상일 때만 우선
          typeValid: { $in: ['$type', ['product', 'service']] },
        },
      },
      {
        $addFields: {
          resolvedType: {
            $cond: [
              '$typeValid',
              '$type',
              {
                $cond: [
                  '$hasProductId',
                  'product',
                  { $cond: ['$hasServiceMarker', 'service', 'service'] }, // 기본값은 service
                ],
              },
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          avg: { $avg: '$rating' },
          five: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
          product: { $sum: { $cond: [{ $eq: ['$resolvedType', 'product'] }, 1, 0] } },
          service: { $sum: { $cond: [{ $eq: ['$resolvedType', 'service'] }, 1, 0] } },
        },
      },
    ])
    .next();

  return NextResponse.json({
    total: agg?.total ?? 0,
    avg: agg?.avg ?? 0,
    five: agg?.five ?? 0,
    byType: { product: agg?.product ?? 0, service: agg?.service ?? 0 },
  });
}
