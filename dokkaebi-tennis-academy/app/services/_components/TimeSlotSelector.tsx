'use client';

import { useMemo } from 'react';
import { parse, isToday, isAfter } from 'date-fns';

interface TimeSlotSelectorProps {
  selected: string;
  selectedDate: string;
  onSelect: (value: string) => void;
  /** 서버에서 내려온 전체 후보 시간대 (예: allTimes) */
  times: string[];
  /** 서버에서 내려온 마감 시간대 (예: reservedTimes) */
  disabledTimes?: string[];
  isLoading?: boolean;
  errorMessage?: string | null;
}

// 1) 상단 import/props는 그대로 두되, 렌더 조건을 바꾼다.

export default function TimeSlotSelector({ selected, selectedDate, onSelect, times, disabledTimes = [], isLoading = false, errorMessage = null }: TimeSlotSelectorProps) {
  const items = useMemo(() => (Array.isArray(times) ? times : []), [times]);

  if (!selectedDate) {
    return (
      <div className="space-y-2">
        <p className="text-muted-foreground text-sm">※ 먼저 장착 희망일을 선택해주세요.</p>
      </div>
    );
  }

  // 400(예약 가능 기간 초과 등)일 때 부모에서 받은 errorMessage를
  //    "안내 배너"로 노출하고, 시간대 격자는 렌더하지 않음.
  if (errorMessage) {
    return (
      <div className="space-y-2">
        <div className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-primary dark:text-primary">{errorMessage}</div>
        {/* 필요하면 이 날짜에서는 선택 불가임을 한번 더 안내 */}
        <p className="text-xs text-muted-foreground">다른 날짜를 선택해주세요.</p>
      </div>
    );
  }

  //  여기부터는 "정상"일 때만 시간대 격자를 보여준다.
  return (
    <div className="space-y-2" aria-busy={isLoading ? true : undefined}>
      <div className="relative">
        <div className={['grid grid-cols-3 gap-2 transition', isLoading ? 'pointer-events-none blur-[2px] opacity-60' : ''].join(' ')}>
          {items.map((time) => {
            const selectedDateTime = parse(`${selectedDate} ${time}`, 'yyyy-MM-dd HH:mm', new Date());
            const now = new Date();
            const isPast = isToday(selectedDateTime) && isAfter(now, selectedDateTime);
            const isReserved = disabledTimes.includes(time);
            const disabled = isPast || isReserved;

            const baseBtn = 'w-full rounded-lg px-3 py-2 text-sm transition-colors border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40';

            if (disabled) {
              return (
                <button
                  key={time}
                  type="button"
                  disabled
                  title={isReserved ? '이미 예약된 시간대입니다' : '지난 시간대입니다'}
                  className={baseBtn + ' cursor-not-allowed bg-muted dark:bg-card text-muted-foreground border-border'}
                  aria-disabled
                >
                  {time}
                </button>
              );
            }

            const selectedStyles =
              selected === time
                ? ' bg-primary text-primary-foreground border-primary/70 shadow-sm'
                : ' bg-card text-foreground border-border hover:bg-background dark:hover:bg-card hover:border-border dark:hover:border-border';

            return (
              <button key={time} type="button" className={baseBtn + selectedStyles} onClick={() => onSelect(time)} aria-pressed={selected === time}>
                {time}
              </button>
            );
          })}
        </div>

        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="rounded-2xl bg-card/60 dark:bg-card backdrop-blur-sm px-4 py-3 shadow-sm">
              <div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-border border-t-transparent" />
              <p className="mt-2 text-xs text-muted-foreground text-center">시간대 불러오는 중…</p>
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground mt-2">🔒 회색으로 표시된 시간은 이미 예약되어 선택할 수 없습니다.</p>
    </div>
  );
}
