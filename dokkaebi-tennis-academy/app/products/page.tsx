import clientPromise from '@/lib/mongodb';
import FilterableProductList from '@/app/products/FilterableProductList';

export default async function ProductsPage() {
  type Product = {
    _id: { toString: () => string };
    name: string;
    brand: string;
    price: number;
    images?: string[];
    features?: Record<string, number>;
    isNew?: boolean;
  };

  const client = await clientPromise;
  const db = client.db();

  // 타입 단언을 위해 as unknown as Product[]를 사용
  const products = (await db.collection('products').find({}).toArray()) as unknown as Product[];

  const rawProducts = await db.collection('products').find({}).toArray();

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-8">스트링 상품 목록</h1>
      <FilterableProductList products={products} />
    </div>
  );
}
