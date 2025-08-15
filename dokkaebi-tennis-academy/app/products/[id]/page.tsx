import ProductDetailClient from '@/app/products/[id]/ProductDetailClient';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function ProductDetailPage({ params }: { params: { id: string } }) {
  const { id } = await params;
  const client = await clientPromise;
  const db = client.db();

  const product = await db.collection('products').findOne({ _id: new ObjectId(id) });
  if (!product) return <div className="p-6 text-red-500 font-bold">상품을 찾을 수 없습니다</div>;

  // 최신 리뷰 10개 주입 + 요약
  const reviews = await db
    .collection('reviews')
    .find({ productId: new ObjectId(id), status: 'visible' })
    .sort({ createdAt: -1 })
    .limit(10)
    .project({ userId: 0 })
    .toArray();

  const agg = await db
    .collection('reviews')
    .aggregate([{ $match: { productId: new ObjectId(id), status: 'visible' } }, { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }])
    .toArray();

  (product as any).reviews = reviews.map((r) => ({
    user: r.userName,
    rating: r.rating,
    date: r.createdAt?.toISOString().slice(0, 10),
    content: r.content,
  }));
  (product as any).reviewSummary = {
    average: agg[0]?.avg ? Number(agg[0].avg.toFixed(2)) : 0,
    count: agg[0]?.count ?? 0,
  };

  if (!product.relatedProducts) (product as any).relatedProducts = [];

  return <ProductDetailClient product={JSON.parse(JSON.stringify(product))} />;
}
