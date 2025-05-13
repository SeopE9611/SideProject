import ProductDetailClient from '@/app/products/[id]/ProductDetailClient';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function ProductDetailPage({ params }: { params: { id: string } }) {
  const client = await clientPromise;
  const db = client.db();
  const product = await db.collection('products').findOne({ _id: new ObjectId(params.id) });

  if (!product) {
    return <div className="p-6 text-red-500 font-bold">상품을 찾을 수 없습니다</div>;
  }

  if (!product.reviews) product.reviews = [];
  if (!product.relatedProducts) product.relatedProducts = [];

  return <ProductDetailClient product={JSON.parse(JSON.stringify(product))} />;
}
