'use client';

import { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { addMinutes, format, isAfter, isToday, parse } from 'date-fns';

interface TimeSlotSelectorProps {
  selected: string;
  selectedDate: string;
  onSelect: (value: string) => void;
}

export default function TimeSlotSelector({ selected, selectedDate, onSelect }: TimeSlotSelectorProps) {
  const [slots, setSlots] = useState<string[]>([]);
  const [reservedSlots, setReservedSlots] = useState<string[]>([]);

  // 예약된 시간대 (예시) ← 실제로는 서버에서 받아올 예정
  useEffect(() => {
    if (!selectedDate) return;

    const fetchReserved = async () => {
      try {
        const res = await fetch(`/api/applications/stringing/reserved?date=${selectedDate}`);
        const data = await res.json(); // ex: ['10:00', '11:30']
        setReservedSlots(Array.isArray(data.reserved) ? data.reserved : []); // 배열로만 세팅
      } catch (err) {
        console.error('예약 시간 불러오기 실패:', err);
      }
    };

    fetchReserved();

    // 오전 10시 ~ 오후 2시까지 30분 단위 고정 시간대 설정
    setSlots(['10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00']);
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
        {slots.map((slot) => {
          const selectedDateTime = parse(`${selectedDate} ${slot}`, 'yyyy-MM-dd HH:mm', new Date());
          const now = new Date();

          const isPast = isToday(selectedDateTime) && isAfter(now, selectedDateTime);
          const isReserved = reservedSlots.includes(slot); // << 해당 시간대가 예약되었는지 확인
          const isDisabled = isPast || isReserved;

          return (
            <Button
              key={slot}
              type="button"
              variant={selected === slot ? 'default' : 'outline'}
              disabled={isDisabled} // << 과거 시간 또는 예약된 시간이면 선택 불가
              onClick={() => onSelect(slot)}
              className="text-sm"
            >
              {slot}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
