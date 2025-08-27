import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { verifyAccessToken } from '@/lib/auth.utils';

export async function GET(req: Request) {
  const token = (await cookies()).get('accessToken')?.value;
  const payload = token ? verifyAccessToken(token) : null;
  if (!payload?.sub) return NextResponse.json({ message: 'unauthorized' }, { status: 401 });

  const db = await getDb();
  const userId = new ObjectId(String(payload.sub));

  const url = new URL(req.url);
  const limit = Math.max(1, Math.min(50, Number(url.searchParams.get('limit') || 10)));
  const cursorB64 = url.searchParams.get('cursor');

  // 커서: createdAt desc, _id desc
  let cursorMatch: any = {};
  if (cursorB64) {
    try {
      const c = JSON.parse(Buffer.from(cursorB64, 'base64').toString('utf-8'));
      cursorMatch = {
        $or: [{ createdAt: { $lt: new Date(c.createdAt) } }, { createdAt: new Date(c.createdAt), _id: { $lt: new ObjectId(c.id) } }],
      };
    } catch {
      /* ignore */
    }
  }

  const rows = await db
    .collection('reviews')
    .aggregate([
      { $match: { userId, isDeleted: { $ne: true } } },
      { $match: cursorMatch },
      { $sort: { createdAt: -1, _id: -1 } },
      { $limit: limit + 1 },

      // 상품 메타(상품 리뷰일 때만)
      {
        $lookup: {
          from: 'products',
          localField: 'productId',
          foreignField: '_id',
          as: 'product',
          pipeline: [{ $project: { name: 1, title: 1, thumbnail: 1, images: 1 } }],
        },
      },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },

      // 필요한 필드만 정리
      {
        $project: {
          _id: 1,
          rating: 1,
          content: 1,
          createdAt: 1,
          updatedAt: 1,
          // 🔹 서버 표준: status 로 통일 (visible | hidden)
          status: {
            $cond: [{ $eq: ['$status', 'hidden'] }, 'hidden', 'visible'],
          },
          photos: { $ifNull: ['$photos', []] },

          productId: 1,
          service: 1,
          serviceApplicationId: 1,

          target: {
            type: { $cond: [{ $ifNull: ['$productId', false] }, 'product', 'service'] },
            name: {
              $cond: [{ $ifNull: ['$productId', false] }, { $ifNull: ['$product.name', '$product.title'] }, '서비스 리뷰'],
            },
            image: {
              $cond: [{ $ifNull: ['$productId', false] }, { $ifNull: ['$product.thumbnail', { $arrayElemAt: ['$product.images', 0] }] }, null],
            },
          },
        },
      },
    ])
    .toArray();

  // 커서 계산
  let nextCursor: string | null = null;
  if (rows.length > limit) {
    const last = rows[limit - 1];
    rows.length = limit;
    nextCursor = Buffer.from(JSON.stringify({ id: String(last._id), createdAt: last.createdAt }), 'utf-8').toString('base64');
  }

  return NextResponse.json({ items: rows, nextCursor });
}
