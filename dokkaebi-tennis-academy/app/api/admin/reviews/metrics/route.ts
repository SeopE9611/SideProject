import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/mongodb';
import { verifyAccessToken } from '@/lib/auth.utils';

export async function GET() {
  const token = (await cookies()).get('accessToken')?.value;
  const payload = token ? verifyAccessToken(token) : null;
  if (!payload?.sub || payload.role !== 'admin') {
    return NextResponse.json({ message: 'forbidden' }, { status: 403 });
  }

  const db = await getDb();
  const col = db.collection('reviews');

  const agg = await col
    .aggregate([
      { $match: { isDeleted: { $ne: true } } },
      {
        $addFields: {
          hasProductId: {
            $or: [{ $ne: [{ $ifNull: ['$productId', null] }, null] }, { $ne: [{ $ifNull: ['$product_id', null] }, null] }],
          },
          resolvedType: {
            $cond: [{ $in: ['$type', ['product', 'service']] }, '$type', { $cond: ['$hasProductId', 'product', 'service'] }],
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
