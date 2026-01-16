'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { racketBrandLabel } from '@/lib/constants';
import { Plus, X } from 'lucide-react';
import { showErrorToast } from '@/lib/toast';
import { useRacketCompareStore } from '@/app/store/racketCompareStore';

export default function RacketCompareTray() {
  const router = useRouter();

  const items = useRacketCompareStore((s) => s.items);
  const remove = useRacketCompareStore((s) => s.remove);
  const clear = useRacketCompareStore((s) => s.clear);

  // 아무것도 담기지 않았으면 트레이 자체를 렌더하지 않음
  if (!items.length) return null;

  // ✅ 비교는 "최소 2개"부터 가능 (4개는 최대치일 뿐)
  const canCompare = items.length >= 2;

  const goCompare = () => {
    if (!canCompare) {
      showErrorToast('라켓 비교는 최소 2개 이상 선택해야 합니다.');
      return;
    }
    router.push('/rackets/compare'); // Step 3-2에서 페이지 만들 예정
  };

  return (
    <>
      {/* 고정 트레이가 화면을 덮지 않도록, 페이지 맨 아래에 여백을 추가 */}
      <div className="h-28" />

      <div className="fixed inset-x-0 bottom-0 z-50">
        <div className="mx-auto w-full px-3 pb-3 bp-sm:px-4 bp-md:px-6 bp-lg:max-w-[1200px]">
          <Card className="border bg-background/95 shadow-lg backdrop-blur">
            <CardContent className="p-3 bp-sm:p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold">
                  라켓 비교 ({items.length}/4)
                  <span className="ml-2 text-xs font-normal text-muted-foreground">최소 2개부터 비교 가능</span>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={clear} className="h-8 px-2">
                    모두 삭제
                  </Button>
                  <Button size="sm" onClick={goCompare} disabled={!canCompare} className="h-8">
                    비교하기
                  </Button>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-4 gap-2">
                {Array.from({ length: 4 }).map((_, idx) => {
                  const it = items[idx];

                  // 빈 슬롯(placeholder)
                  if (!it) {
                    return (
                      <div key={idx} className="flex h-16 items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
                        <Plus className="mr-1 h-3 w-3" />
                        비어 있음
                      </div>
                    );
                  }

                  const title = `${it.model}${it.year ? ` (${it.year})` : ''}`;
                  const brandText = racketBrandLabel(it.brand);

                  return (
                    <div key={it.id} className="group relative flex h-16 items-center gap-2 rounded-md border bg-card px-2">
                      <div className="relative h-12 w-12 overflow-hidden rounded bg-muted">
                        {it.image ? <Image src={it.image} alt={title} fill className="object-cover" unoptimized /> : <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">No Image</div>}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-medium">{title}</div>
                        <div className="truncate text-[11px] text-muted-foreground">{brandText}</div>
                      </div>

                      <button
                        type="button"
                        onClick={() => remove(it.id)}
                        className={cn('absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full', 'bg-background/80 opacity-0 shadow-sm transition', 'group-hover:opacity-100 hover:bg-muted')}
                        aria-label={`${title} 제거`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
