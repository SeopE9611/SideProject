"use client";

import { useMemo } from "react";
import { parse, isToday, isAfter } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

interface TimeSlotSelectorProps {
  selected: string;
  selectedDate: string;
  onSelect: (value: string) => void;
  /** 서버에서 내려온 전체 후보 시간대 (예: allTimes) */
  times: string[];
  /** 서버에서 내려온 마감 시간대 (예: reservedTimes) */
  disabledTimes?: string[];
  /** 실제 예약 점유로 막힌 시간대 (reserved) */
  reservedTimes?: string[];
  isLoading?: boolean;
  errorMessage?: string | null;
}

// 1) 상단 import/props는 그대로 두되, 렌더 조건을 바꾼다.

export default function TimeSlotSelector({
  selected,
  selectedDate,
  onSelect,
  times,
  disabledTimes = [],
  reservedTimes = [],
  isLoading = false,
  errorMessage = null,
}: TimeSlotSelectorProps) {
  const items = useMemo(() => (Array.isArray(times) ? times : []), [times]);

  if (!selectedDate) {
    return (
      <div className="space-y-2">
        <p className="text-muted-foreground text-sm">
          ※ 먼저 장착 희망일을 선택해주세요.
        </p>
      </div>
    );
  }

  // 400(예약 가능 기간 초과 등)일 때 부모에서 받은 errorMessage를
  //    "안내 배너"로 노출하고, 시간대 격자는 렌더하지 않음.
  if (errorMessage) {
    return (
      <div className="space-y-2">
        <div className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground">
          {errorMessage}
        </div>
        {/* 필요하면 이 날짜에서는 선택 불가임을 한번 더 안내 */}
        <p className="text-xs text-muted-foreground">
          다른 날짜를 선택해주세요.
        </p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="space-y-2" aria-busy={isLoading ? true : undefined}>
        {/* 빈 그리드를 노출하지 않아 휴무/비영업일을 버그로 오해하지 않게 한다. */}
        <div className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground">
          해당 날짜는 예약 가능한 시간이 없습니다(휴무/영업시간 없음). 다른
          날짜를 선택해주세요.
        </div>
      </div>
    );
  }

  //  여기부터는 "정상"일 때만 시간대 격자를 보여준다.
  return (
    <div className="space-y-3" aria-busy={isLoading ? true : undefined}>
      <div className="relative">
        <div
          className={[
            "grid grid-cols-3 gap-2.5 bp-sm:gap-3 transition",
            isLoading ? "pointer-events-none blur-[2px] opacity-60" : "",
          ].join(" ")}
        >
          {items.map((time) => {
            const selectedDateTime = parse(
              `${selectedDate} ${time}`,
              "yyyy-MM-dd HH:mm",
              new Date(),
            );
            const now = new Date();
            const isPast =
              isToday(selectedDateTime) && isAfter(now, selectedDateTime);
            const isReserved = reservedTimes.includes(time);
            const isBlocked = disabledTimes.includes(time);
            const disabled = isPast || isBlocked;
            const reason = isPast
              ? "종료"
              : isReserved
                ? "예약됨"
                : isBlocked
                  ? "연속 불가"
                  : null;

            const baseBtn =
              "w-full rounded-lg border px-3 py-2.5 text-sm leading-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 bp-sm:min-h-11";

            if (disabled) {
              return (
                <button
                  key={time}
                  type="button"
                  disabled
                  title={
                    reason === "종료"
                      ? "지난 시간대입니다"
                      : reason === "예약됨"
                        ? "이미 예약된 시간대입니다"
                        : "연속 슬롯 확보가 불가능한 시간대입니다"
                  }
                  className={
                    baseBtn +
                    " cursor-not-allowed border-border bg-muted/65 text-[11px] text-muted-foreground bp-sm:text-xs"
                  }
                  aria-disabled
                >
                  {reason ? `${time} (${reason})` : time}
                </button>
              );
            }

            const selectedStyles =
              selected === time
                ? " border-primary/75 bg-primary text-primary-foreground shadow-sm"
                : " border-border bg-card text-foreground hover:border-primary/30 hover:bg-background";

            return (
              <button
                key={time}
                type="button"
                className={baseBtn + selectedStyles}
                onClick={() => onSelect(time)}
                aria-pressed={selected === time}
              >
                {time}
              </button>
            );
          })}
        </div>

        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="rounded-2xl bg-card/60 dark:bg-card backdrop-blur-sm px-4 py-3 shadow-sm">
              <div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-border border-t-transparent" />
              <div className="mt-2 flex justify-center">
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </div>
        )}
      </div>

      <p className="mt-1 text-xs text-muted-foreground">
        🔒 비활성 시간은 종료/예약됨/연속 불가 사유로 선택할 수 없습니다.
      </p>
    </div>
  );
}
