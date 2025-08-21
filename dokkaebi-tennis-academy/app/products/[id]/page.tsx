import ProductDetailClient from '@/app/products/[id]/ProductDetailClient';
import { verifyAccessToken } from '@/lib/auth.utils';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { cookies } from 'next/headers';

export default async function ProductDetailPage({ params }: { params: { id: string } }) {
  const { id } = await params;
  const client = await clientPromise;
  const db = client.db();
  const token = (await cookies()).get('accessToken')?.value;
  let currentUserId: ObjectId | null = null;
  if (token) {
    const payload = verifyAccessToken(token);
    if (payload?.sub) currentUserId = new ObjectId(String(payload.sub));
  }

  const product = await db.collection('products').findOne({ _id: new ObjectId(id) });
  if (!product) return <div className="p-6 text-red-500 font-bold">상품을 찾을 수 없습니다</div>;

  // 최신 리뷰 10개 (숨김 포함) — 서버에서 보안 마스킹
  const reviews = await db
    .collection('reviews')
    .aggregate([
      {
        $match: {
          productId: new ObjectId(id),
          status: { $in: ['visible', 'hidden'] },
        },
      },
      { $sort: { createdAt: -1, _id: -1 } },
      { $limit: 10 },
      {
        $project: {
          _id: 1,
          rating: 1,
          createdAt: 1,
          status: 1,
          helpfulCount: 1,
          userId: 1, // ownedByMe 계산용 (다음 스테이지에서 제거)
          // 숨김이면 보안상 원본 차단(마스킹)
          userName: { $cond: [{ $eq: ['$status', 'hidden'] }, null, '$userName'] },
          content: { $cond: [{ $eq: ['$status', 'hidden'] }, null, '$content'] },
          photos: { $cond: [{ $eq: ['$status', 'hidden'] }, [], { $ifNull: ['$photos', []] }] },
          masked: { $eq: ['$status', 'hidden'] },
        },
      },
      ...(currentUserId ? [{ $addFields: { ownedByMe: { $eq: ['$userId', currentUserId] } } }] : [{ $addFields: { ownedByMe: false } }]),
      { $project: { userId: 0 } }, // 노출 불가
    ])
    .toArray();

  const agg = await db
    .collection('reviews')
    .aggregate([{ $match: { productId: new ObjectId(id), status: 'visible' } }, { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }])
    .toArray();

  (product as any).reviews = reviews.map((r: any) => ({
    _id: r._id,
    user: r.userName,
    rating: r.rating,
    date: r.createdAt?.toISOString().slice(0, 10),
    content: r.content,
    status: r.status,
    photos: r.photos,
    masked: r.masked,
    ownedByMe: r.ownedByMe,
  }));
  (product as any).reviewSummary = {
    average: agg[0]?.avg ? Number(agg[0].avg.toFixed(2)) : 0,
    count: agg[0]?.count ?? 0,
  };

  if (!product.relatedProducts) (product as any).relatedProducts = [];

  return <ProductDetailClient product={JSON.parse(JSON.stringify(product))} />;
}
