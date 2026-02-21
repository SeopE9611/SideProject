'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { racketBrandLabel } from '@/lib/constants';
import { Plus, X, Scale, Trash2, ArrowRight } from 'lucide-react';
import { showErrorToast } from '@/lib/toast';
import { useRacketCompareStore } from '@/app/store/racketCompareStore';

export default function RacketCompareTray() {
  const router = useRouter();

  const items = useRacketCompareStore((s) => s.items);
  const remove = useRacketCompareStore((s) => s.remove);
  const clear = useRacketCompareStore((s) => s.clear);

  if (!items.length) return null;

  const canCompare = items.length >= 2;

  const goCompare = () => {
    if (!canCompare) {
      showErrorToast('라켓 비교는 최소 2개 이상 선택해야 합니다.');
      return;
    }
    router.push('/rackets/compare');
  };

  return (
    <>
      <div className="h-32 bp-sm:h-36" />

      <div data-bottom-sticky="1" className="fixed inset-x-0 bottom-0 z-50">
        <div className="mx-auto w-full px-3 pb-3 bp-sm:px-4 bp-md:px-6 bp-lg:max-w-[1200px]">
          <div className="rounded-xl bg-background/95 shadow-xl backdrop-blur-md ring-1 ring-primary/10 dark:ring-white/10">
            <div className="p-3 bp-sm:p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 dark:bg-primary/20">
                    <Scale className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">
                      라켓 비교
                      <span className="ml-1.5 text-primary">({items.length}/4)</span>
                    </div>
                    <div className="text-xs text-muted-foreground hidden bp-sm:block">최소 2개부터 비교 가능</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={clear} className="h-8 px-2 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    <span className="hidden bp-sm:inline">모두 삭제</span>
                  </Button>
                  <Button size="sm" onClick={goCompare} disabled={!canCompare} className="h-8 gap-1.5 rounded-lg">
                    비교하기
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 bp-sm:grid-cols-4 gap-2">
                {Array.from({ length: 4 }).map((_, idx) => {
                  const it = items[idx];

                  if (!it) {
                    return (
                      <div key={idx} className={cn('flex h-16 bp-sm:h-18 items-center justify-center rounded-lg', 'bg-muted/30 dark:bg-muted/20', 'ring-1 ring-dashed ring-muted-foreground/20', 'text-xs text-muted-foreground/60')}>
                        <Plus className="mr-1 h-3 w-3" />
                        비어 있음
                      </div>
                    );
                  }

                  const title = `${it.model}${it.year ? ` (${it.year})` : ''}`;
                  const brandText = racketBrandLabel(it.brand);

                  return (
                    <div
                      key={it.id}
                      className={cn(
                        'group relative flex h-16 bp-sm:h-18 items-center gap-2 rounded-lg px-2',
                        'bg-card/80',
                        'ring-1 ring-primary/20 dark:ring-primary/30',
                        'transition-all duration-200',
                        'hover:ring-primary/40 hover:shadow-sm',
                      )}
                    >
                      <div className="relative h-11 w-11 bp-sm:h-12 bp-sm:w-12 shrink-0 overflow-hidden rounded-md bg-muted/50 dark:bg-muted/30 ring-1 ring-black/5 dark:ring-white/10">
                        {it.image ? (
                          <Image src={it.image || '/placeholder.svg'} alt={title} fill className="object-cover" unoptimized />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">No Image</div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-medium">{title}</div>
                        <div className="truncate text-[11px] text-muted-foreground">{brandText}</div>
                      </div>

                      <button
                        type="button"
                        onClick={() => remove(it.id)}
                        className={cn(
                          'absolute -right-1 -top-1 inline-flex h-5 w-5 items-center justify-center rounded-full',
                          'bg-destructive/90 text-destructive-foreground',
                          'shadow-sm transition-all duration-200',
                          'opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100',
                          'hover:bg-destructive',
                        )}
                        aria-label={`${title} 제거`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
