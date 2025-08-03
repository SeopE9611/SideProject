import clientPromise from '@/lib/mongodb';
import FilterableProductList from '@/app/products/FilterableProductList';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default async function ProductsPage() {
  type Product = {
    _id: string;
    name: string;
    brand: string;
    price: number;
    images?: string[];
    features?: Record<string, number>;
    isNew?: boolean;
  };

  const client = await clientPromise;
  const db = client.db();

  // 런타임에 타입 변환 (ObjectId -> string)
  const products = (await db.collection('products').find({}).toArray()).map((product) => ({
    ...product,
    _id: product._id.toString(),
  })) as Product[];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-teal-600 py-24">
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute inset-0 bg-[url('/placeholder.svg?height=400&width=800')] bg-cover bg-center opacity-10" />

        <div className="relative container mx-auto px-4">
          <div className="text-center text-white">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">프리미엄 테니스 스트링</h1>
            <p className="text-xl md:text-2xl mb-8 text-blue-100 max-w-3xl mx-auto">15년 경력의 전문가가 엄선한 최고급 스트링으로 당신의 플레이를 한 단계 업그레이드하세요</p>
            <div className="flex flex-wrap justify-center gap-8 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />
                <span>100% 정품 보장</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                <span>전국 무료배송</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse" />
                <span>전문가 상담</span>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute top-20 left-10 w-20 h-20 bg-white/10 rounded-full blur-xl animate-float" />
        <div className="absolute bottom-20 right-10 w-32 h-32 bg-white/5 rounded-full blur-2xl animate-float-delayed" />
      </div>

      <div className="container mx-auto px-4 py-12">
        <Suspense>
          <FilterableProductList />
        </Suspense>
      </div>
    </div>
  );
}
