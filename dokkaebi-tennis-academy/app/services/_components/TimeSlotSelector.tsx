'use client';

import { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

interface Props {
  selected: string;
  onSelect: (value: string) => void;
  selectedDate: string;
}

// 고정된 시간대만 제공 (10:00 ~ 14:00, 30분 단위)
const FIXED_TIME_SLOTS = ['10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00']; // 추가<<

export default function TimeSlotSelector({ selected, onSelect, selectedDate }: Props) {
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);

  useEffect(() => {
    if (!selectedDate) {
      setAvailableSlots([]);
      return;
    }

    // 오늘 날짜인지 확인
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
      const d = new Date(selectedDate);
      if (!isNaN(d.getTime())) {
        formattedDate = d.toISOString().split('T')[0];
      }
    }

    const isToday = formattedDate === todayStr;
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
    const nowHour = now.getHours();
    const nowMinute = now.getMinutes();

    // 선택 가능한 슬롯 계산 (오늘이면 현재 시간 이후만)
    const filtered = FIXED_TIME_SLOTS.filter((slot) => {
      if (!isToday) return true;

      const [h, m] = slot.split(':').map(Number);
      return h > nowHour || (h === nowHour && m > nowMinute);
    });

    setAvailableSlots(filtered);
  }, [selectedDate]);

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">
        장착 희망 시간대 <span className="text-red-500">*</span>
      </Label>

      {!selectedDate ? (
        <p className="text-sm text-muted-foreground">장착 희망일을 먼저 선택해주세요.</p>
      ) : availableSlots.length === 0 ? (
        <p className="text-sm text-muted-foreground">선택 가능한 시간이 없습니다.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {availableSlots.map((slot) => {
            const isSelected = selected === slot;
            return (
              <Button key={slot} type="button" variant={isSelected ? 'default' : 'outline'} onClick={() => onSelect(slot)} className="w-20 justify-center">
                {slot}
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}
