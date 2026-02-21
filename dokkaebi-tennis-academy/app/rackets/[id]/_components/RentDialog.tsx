'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Calendar, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  id: string;
  rental: any;
  brand: string;
  model: string;
  autoOpen?: boolean;
  /** 리스트/그리드에서 버튼 크기 맞추기용 */
  size?: 'sm' | 'default';
  /** 외부에서 톤 보정이 필요할 때 */
  className?: string;
  /** 카드가 <Link>로 감싸진 경우 네비게이션 막기 */
  preventCardNav?: boolean;
  /** 버튼을 가로로 꽉 채울지 여부(리스트/그리드에선 false, 상세/모바일 스티키에선 true) */
  full?: boolean;
};

export default function RentDialog({ id, rental, brand, model, autoOpen, size = 'default', className = '', preventCardNav = true, full = false }: Props) {
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState<7 | 15 | 30>(7);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // useEffect(() => {
  //   if (autoOpen) setOpen(true);
  // }, [autoOpen]);

  const fee = period === 7 ? rental.fee.d7 : period === 15 ? rental.fee.d15 : rental.fee.d30;

  // const safeJson = async (res: Response) => {
  //   try {
  //     return await res.json();
  //   } catch {
  //     return {};
  //   }
  // };

  const onSubmit = () => {
    setLoading(true);
    setOpen(false);
    router.push(`/rentals/${id}/select-string?period=${period}`);
  };

  return (
    <>
      <Button
        size={size}
        className={cn(full ? 'w-full h-12 min-w-0 justify-center gap-2' : '', 'bg-gradient-to-r from-background to-card hover:from-background hover:to-card text-white shadow-lg', className)}
        onClick={() => setOpen(true)}
      >
        <Calendar className="mr-2 h-4 w-4" />
        대여 하기
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-background to-card bg-clip-text text-transparent">대여 신청</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-gradient-to-r from-background to-card dark:from-background dark:to-card p-4 rounded-lg border border-border dark:border-border">
              <div className="text-sm text-muted-foreground mb-1">선택한 라켓</div>
              <div className="font-semibold text-foreground">
                {brand} {model}
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-sm font-semibold text-foreground">기간 선택</div>
              <div className="grid grid-cols-3 gap-2">
                {[7, 15, 30].map((d) => (
                  <button
                    key={d}
                    onClick={() => setPeriod(d as 7 | 15 | 30)}
                    className={`h-12 px-3 rounded-lg border-2 font-medium transition-all ${
                      period === d
                        ? 'bg-gradient-to-r from-background to-card dark:from-background dark:to-card border-border dark:border-border text-primary dark:text-primary'
                        : 'border-border hover:border-border dark:hover:border-border text-foreground'
                    }`}
                  >
                    {d}일
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-r from-background to-muted dark:from-slate-800 dark:to-slate-700 p-4 rounded-lg border border-border dark:border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">대여 수수료</span>
                <span className="font-bold text-foreground">{fee.toLocaleString()}원</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">보증금</span>
                <span className="font-bold text-foreground">{(rental.deposit ?? 0).toLocaleString()}원</span>
              </div>
              <div className="pt-2 border-t border-border dark:border-border">
                <div className="text-xs text-muted-foreground">* 반납 완료 시 보증금 환불 (연체/파손 시 차감)</div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              취소
            </Button>
            <Button className="bg-gradient-to-r from-background to-card text-white" onClick={onSubmit} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  처리 중...
                </>
              ) : (
                '대여 신청'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
