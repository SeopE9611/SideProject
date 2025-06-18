'use client';

import { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

interface Props {
  selected: string; // 현재 선택된 시간대 값 (ex: '14:00')
  onSelect: (value: string) => void; // 시간대 클릭 시 상위 컴포넌트에 전달하는 함수
  selectedDate: string; // 사용자가 선택한 날짜 (예: '2025-06-19')
}

// 샵 운영 시간 (09시부터 17시까지)
const OPEN_HOUR = 9;
const CLOSE_HOUR = 17;

export default function TimeSlotSelector({ selected, onSelect, selectedDate }: Props) {
  // 시간대 배열 상태
  const [slots, setSlots] = useState<number[]>([]);

  useEffect(() => {
    // 오늘 날짜를 KST 기준으로 'YYYY-MM-DD' 문자열로 얻기 위한 Intl API
    const todayStr = new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul', // 한국 시간대
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .format(new Date()) // 현재 시간
      .replace(/\. /g, '-') // '2025. 06. 19.' → '2025-06-19.'
      .replace(/\.$/, ''); // 맨 끝의 점(.) 제거

    // formattedSelectedDate 선언
    let formattedSelectedDate = '';
    if (selectedDate) {
      const d = new Date(selectedDate);
      if (!isNaN(d.getTime())) {
        formattedSelectedDate = d.toISOString().split('T')[0];
      }
    }

    // 과거 날짜는 그냥 슬롯을 비워버리고 종료
    if (formattedSelectedDate && formattedSelectedDate < todayStr) {
      setSlots([]);
      return;
    }

    // 오늘인지 비교
    const isToday = formattedSelectedDate === todayStr;

    // 현재 한국 시간(KST)을 구함
    const nowKST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
    const currentHour = nowKST.getHours();

    // 시작 시간을 오늘/내일 구분해서 결정
    const startHour = isToday ? Math.max(OPEN_HOUR, currentHour + 1) : OPEN_HOUR;

    // 운영 시간 내에서 선택 가능한 시간대를 담을 배열
    const available: number[] = [];
    for (let hour = startHour; hour <= CLOSE_HOUR; hour++) {
      available.push(hour);
    }

    // 상태에 저장
    setSlots(available);
  }, [selectedDate]); // selectedDate가 바뀔 때마다 재실행

  return (
    <div className="space-y-2">
      {/* 라벨 */}
      <Label className="text-sm font-medium">
        장착 희망 시간대 <span className="text-red-500">*</span>
      </Label>

      {/* 시간대 버튼 그룹 */}
      {!selectedDate ? (
        <p className="text-sm text-muted-foreground">장착 희망일을 우선 선택하세요</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {slots.map((hour) => {
            // 버튼에 표시할 시간 문자열 (ex: '09:00')
            const label = `${hour.toString().padStart(2, '0')}:00`;
            // 현재 버튼이 선택된 시간대인지 여부
            const isSelected = selected === label;

            // disabled 상태 계산: 오늘이고 현재 시간보다 이전 또는 같은 시간은 비활성화
            const isDisabled = (() => {
              // 오늘 날짜 KST 구하기 (같은 로직 반복)
              const todayStr = new Intl.DateTimeFormat('ko-KR', {
                timeZone: 'Asia/Seoul',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
              })
                .format(new Date())
                .replace(/\. /g, '-')
                .replace(/\.$/, '');

              let formattedDate = '';
              if (selectedDate) {
                const dd = new Date(selectedDate);
                if (!isNaN(dd.getTime())) {
                  formattedDate = dd.toISOString().split('T')[0];
                }
              }

              const todayFlag = formattedDate === todayStr && formattedDate !== '';
              const nowHour = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' })).getHours();

              // 오늘이고 현재 시간 이하라면 disabled true
              return todayFlag && hour <= nowHour;
            })();

            return (
              <Button
                key={label}
                type="button"
                variant={isSelected ? 'default' : 'outline'}
                onClick={() => onSelect(label)}
                className="w-20 justify-center"
                disabled={isDisabled} // 비활성화 적용
              >
                {label}
              </Button>
            );
          })}

          {/* 선택 가능한 시간이 없을 경우 안내 메시지 */}
          {slots.length === 0 && <p className="text-sm text-muted-foreground">선택 가능한 시간이 없습니다</p>}
        </div>
      )}
    </div>
  );
}
