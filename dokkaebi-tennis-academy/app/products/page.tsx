import clientPromise from '@/lib/mongodb';
import FilterableProductList from '@/app/products/components/FilterableProductList';
import { Suspense } from 'react';

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
    <div className="min-h-full bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-700 dark:via-indigo-700 dark:to-purple-700 py-16 md:py-24">
        <div className="absolute inset-0 bg-black/10 dark:bg-black/30" />
        {/* Tennis court line pattern background */}
        <div className="absolute inset-0 opacity-20 dark:opacity-10">
          <svg className="w-full h-full" viewBox="0 0 800 400" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="court-lines" patternUnits="userSpaceOnUse" width="200" height="100">
                <rect width="200" height="100" fill="transparent" />
                <line x1="0" y1="50" x2="200" y2="50" stroke="white" strokeWidth="2" opacity="0.3" />
                <line x1="100" y1="0" x2="100" y2="100" stroke="white" strokeWidth="2" opacity="0.3" />
                <rect x="25" y="25" width="150" height="50" fill="none" stroke="white" strokeWidth="1" opacity="0.2" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#court-lines)" />
          </svg>
        </div>

        <div className="absolute top-10 left-4 md:left-10 w-16 h-16 md:w-20 md:h-20 bg-white/10 rounded-full blur-xl animate-float" />
        <div className="absolute bottom-10 right-4 md:right-10 w-24 h-24 md:w-32 md:h-32 bg-white/5 rounded-full blur-2xl animate-float-delayed" />
        <div className="absolute top-1/2 left-1/4 w-12 h-12 bg-blue-300/20 rounded-full blur-lg animate-pulse" />

        <div className="relative container mx-auto px-4 md:px-6">
          <div className="text-center text-white">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 md:mb-6 bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent leading-tight">프리미엄 테니스 스트링</h1>
            <p className="text-lg sm:text-xl md:text-2xl mb-6 md:mb-8 text-blue-100 dark:text-blue-200 max-w-3xl mx-auto leading-relaxed px-4">15년 경력의 전문가가 엄선한 최고급 스트링으로 당신의 플레이를 한 단계 업그레이드하세요</p>
            <div className="flex flex-wrap justify-center gap-4 md:gap-8 text-sm md:text-base">
              <div className="flex items-center gap-2 bg-white/10 dark:bg-white/5 backdrop-blur-sm rounded-full px-4 py-2">
                <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />
                <span>100% 정품 보장</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 dark:bg-white/5 backdrop-blur-sm rounded-full px-4 py-2">
                <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse" />
                <span>전국 무료배송</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 dark:bg-white/5 backdrop-blur-sm rounded-full px-4 py-2">
                <div className="w-3 h-3 bg-indigo-400 rounded-full animate-pulse" />
                <span>전문가 상담</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-6 py-8 md:py-12">
        <Suspense>
          <FilterableProductList />
        </Suspense>
      </div>
    </div>
  );
}
