"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Calendar, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  id: string;
  rental: any;
  brand: string;
  model: string;
  autoOpen?: boolean;
  /** 리스트/그리드에서 버튼 크기 맞추기용 */
  size?: "sm" | "default";
  /** 외부에서 톤 보정이 필요할 때 */
  className?: string;
  /** 카드가 <Link>로 감싸진 경우 네비게이션 막기 */
  preventCardNav?: boolean;
  /** 버튼을 가로로 꽉 채울지 여부(리스트/그리드에선 false, 상세/모바일 스티키에선 true) */
  full?: boolean;
  variant?: React.ComponentProps<typeof Button>["variant"];
  label?: string;
  ariaLabel?: string;
};

export default function RentDialog({
  id,
  rental,
  brand,
  model,
  autoOpen,
  size = "default",
  className = "",
  preventCardNav = true,
  full = false,
  variant = "default",
  label = "스트링 선택 후 대여",
  ariaLabel,
}: Props) {
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
        variant={variant}
        wrap="nowrap"
        aria-label={ariaLabel ?? label}
        className={cn(
          "min-w-0 rounded-xl shadow-sm",
          full ? "h-12 w-full justify-center gap-2" : "gap-1.5",
          className,
        )}
        onClick={() => setOpen(true)}
      >
        <Calendar className="h-4 w-4 shrink-0" />
        <span className="whitespace-nowrap">{label}</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto border border-border bg-card shadow-sm sm:max-w-md">
          <DialogHeader className="pr-8 text-left">
            <DialogTitle className="text-ui-section-title font-semibold text-foreground">
              대여 기간 선택
            </DialogTitle>
            <DialogDescription className="break-keep text-ui-body-sm text-muted-foreground">
              스트링 선택 단계로 이동하기 전 대여 기간을 선택해 주세요.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-muted/20 p-4">
              <div className="mb-1 text-ui-body-sm text-muted-foreground">선택한 라켓</div>
              <div className="min-w-0 break-keep font-semibold text-foreground">
                {brand} {model}
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-ui-body-sm font-semibold text-foreground">기간 선택</div>
              <div className="grid grid-cols-3 gap-2">
                {[7, 15, 30].map((d) => {
                  const selected = period === d;

                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setPeriod(d as 7 | 15 | 30)}
                      className={cn(
                        "h-12 rounded-xl border px-2 text-ui-body-sm font-semibold transition-colors",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        selected
                          ? "border-primary/40 bg-primary/5 text-primary"
                          : "border-border bg-background text-foreground hover:bg-muted/30",
                      )}
                    >
                      {d}일
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-border bg-background p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 break-keep text-ui-body-sm text-muted-foreground">
                  대여료
                </span>
                <span className="shrink-0 whitespace-nowrap text-right font-semibold text-foreground tabular-nums">
                  {fee.toLocaleString()}원
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 break-keep text-ui-body-sm text-muted-foreground">
                  보증금
                </span>
                <span className="shrink-0 whitespace-nowrap text-right font-semibold text-foreground tabular-nums">
                  {(rental.deposit ?? 0).toLocaleString()}원
                </span>
              </div>
              <div className="border-t border-border pt-3">
                <div className="break-keep text-ui-label leading-relaxed text-muted-foreground">
                  * 반납 완료 시 보증금 환불 (연체/파손 시 차감)
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2 [&_button]:h-11 [&_button]:rounded-xl sm:[&_button]:min-w-24">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              취소
            </Button>
            <Button onClick={onSubmit} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  이동 중...
                </>
              ) : (
                "스트링 선택으로 이동"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
