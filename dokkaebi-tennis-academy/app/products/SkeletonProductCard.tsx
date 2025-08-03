// 파일: app/products/SkeletonProductCard.tsx
import { cn } from '@/lib/utils';

export function SkeletonProductCard() {
  return (
    <div className="h-full overflow-hidden rounded-lg bg-white/90 dark:bg-slate-800/70 shadow relative">
      <div className="h-56 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      <div className="p-4 space-y-2">
        <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="h-3 w-1/2 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="flex gap-2">
          <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
      </div>

      <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_1.5s_infinite]" />
      <style>{`
        @keyframes shimmer {
          0% { background-position: -100% 0; }
          100% { background-position: 100% 0; }
        }
      `}</style>
    </div>
  );
}

function SkeletonLine({ width = '100%', height = '1rem', className = '' }: { width?: string; height?: string; className?: string }) {
  return <div className={cn('bg-gray-200 dark:bg-gray-700 rounded animate-pulse', className)} style={{ width, height }} aria-hidden="true" />;
}

export function SkeletonFilterDetailed({ performanceCount = 5 }: { performanceCount?: number }) {
  return (
    <div className="space-y-6" aria-hidden="true">
      {/* 헤더: 타이틀 + 초기화 버튼 */}
      <div className="flex items-center justify-between">
        <SkeletonLine width="40%" height="1.25rem" />
        <div className="w-20">
          <SkeletonLine width="100%" height="1rem" />
        </div>
      </div>

      {/* 검색 */}
      <div className="mb-6">
        <SkeletonLine width="25%" height="0.75rem" className="mb-2" />
        <div className="relative flex items-center">
          <div className="absolute left-3">
            <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
          <div className="w-full pl-10">
            <SkeletonLine width="100%" height="2rem" />
          </div>
        </div>
      </div>

      {/* 가격 범위 */}
      <div className="mb-6">
        <SkeletonLine width="30%" height="0.75rem" className="mb-2" />
        <div className="space-y-2">
          {/* 슬라이더 바 */}
          <SkeletonLine width="100%" height="1rem" className="rounded-full" />
          {/* 범위 숫자 */}
          <div className="flex justify-between mt-1">
            <SkeletonLine width="25%" height="1rem" />
            <SkeletonLine width="25%" height="1rem" />
          </div>
        </div>
      </div>

      {/* 브랜드 */}
      <div className="mb-6">
        <SkeletonLine width="25%" height="0.75rem" className="mb-2" />
        <SkeletonLine width="100%" height="2rem" className="rounded-lg" />
      </div>

      {/* 성능 필터들 */}
      <div className="space-y-4">
        <h3 className="sr-only">성능</h3>
        {Array.from({ length: performanceCount }).map((_, idx) => (
          <div key={idx}>
            <SkeletonLine width="35%" height="0.75rem" className="mb-2" />
            <SkeletonLine width="100%" height="2rem" className="rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
