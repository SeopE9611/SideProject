'use client';

import { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { addMinutes, format, isAfter, isToday, parse } from 'date-fns';

interface TimeSlotSelectorProps {
  selected: string;
  selectedDate: string;
  onSelect: (value: string) => void; // YYYY-MM-DD
}

export default function TimeSlotSelector({ selected, selectedDate, onSelect }: TimeSlotSelectorProps) {
  const [slots, setSlots] = useState<string[]>([]);
  const [reservedTimes, setReservedTimes] = useState<string[]>([]); // 예약된 시간대 리스트

  useEffect(() => {
    const generateSlots = () => {
      //  시간대 생성 결과를 담을 배열
      const result: string[] = [];

      //  시간대 범위: 오전 10시부터 오후 1시 30분까지는 30분 간격
      const startHour = 10;
      const endHour = 14; // 14시는 반복문에서 포함되지 않기 때문에 따로 추가함
      const interval = 30; // 분 단위 간격 (30분 간격)

      // 10:00 ~ 13:30 생성 (ex: 10:00, 10:30, 11:00, ..., 13:30)
      for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += interval) {
          const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          result.push(time);
        }
      }

      // 14:00은 마지막으로 수동 추가 (for문에는 포함되지 않음)
      result.push('14:00');

      //  완성된 시간대 리스트를 상태로 반영
      setSlots(result);
    };

    //  컴포넌트가 처음 렌더링될 때 한 번만 실행
    generateSlots();
  }, []);

  // 예약된 시간대 (예시) ← 실제로는 서버에서 받아올 예정
  useEffect(() => {
    if (!selectedDate) return; // date가 없으면 요청하지 않음
    //  예약된 시간대를 불러온다
    const fetchReservedTimes = async () => {
      if (!selectedDate) return;
      try {
        const res = await fetch(`/api/applications/stringing/submit/reserved?date=${selectedDate}`);
        if (!res.ok) throw new Error('예약된 시간 조회 실패');
        const data = await res.json();

        // 예외 방지: data.reservedTimes가 없거나 배열이 아닌 경우도 처리
        setReservedTimes(Array.isArray(data.reservedTimes) ? data.reservedTimes : []);
      } catch (error) {
        console.error('예약 시간 불러오기 에러:', error);
        setReservedTimes([]); // 실패 시에도 안전한 상태로 초기화
      }
    };

    fetchReservedTimes();
  }, [selectedDate]);

  // 장착 희망일이 없으면 안내 문구 출력
  if (!selectedDate) {
    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium">장착 희망 시간대</Label>
        <p className="text-muted-foreground text-sm">※ 먼저 장착 희망일을 선택해주세요.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">장착 희망 시간대</Label>
      <div className="grid grid-cols-3 gap-2">
        {slots.map((time) => {
          const selectedDateTime = parse(`${selectedDate} ${time}`, 'yyyy-MM-dd HH:mm', new Date());
          const now = new Date();

          const isPast = isToday(selectedDateTime) && isAfter(now, selectedDateTime);
          const isReserved = reservedTimes.includes(time); // 해당 시간대가 예약되었는지 확인
          const isDisabled = isPast || isReserved;

          return isDisabled ? (
            <div key={time} className="relative group">
              <button type="button" disabled className="rounded-md px-3 py-2 text-sm border bg-muted text-gray-400 cursor-not-allowed w-full">
                {time}
              </button>
              <div className="absolute left-1/2 top-full z-10 mt-1 w-max -translate-x-1/2 scale-95 whitespace-nowrap rounded bg-black px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition">이미 예약된 시간대입니다</div>
            </div>
          ) : (
            <button key={time} type="button" className={`rounded-md px-3 py-2 text-sm border w-full ${selected === time ? 'bg-primary text-white' : 'bg-white hover:bg-accent'}`} onClick={() => onSelect(time)}>
              {time}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground mt-2">🔒 회색으로 표시된 시간은 이미 예약되어 선택할 수 없습니다.</p>
    </div>
  );
}
