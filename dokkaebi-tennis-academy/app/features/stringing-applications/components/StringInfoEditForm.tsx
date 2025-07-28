'use client';

import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { showSuccessToast, showErrorToast } from '@/lib/toast';
import { format, parseISO } from 'date-fns';
import TimeSlotSelector from '@/app/services/_components/TimeSlotSelector';
import StringCheckboxes from '@/app/services/_components/StringCheckboxes';

interface Props {
  id: string;
  initial: {
    desiredDateTime?: string; // "YYYY-MM-DDThh:mm"
    stringTypes?: string[];
    racketType?: string;
    customStringName?: string; // 추가
  };
  stringOptions: { id: string; name: string; mountingFee: number }[];
  onDone: () => void;
  mutateData: () => void;
  mutateHistory: () => void;
}

export default function StringInfoEditForm({ id, initial, stringOptions, onDone, mutateData, mutateHistory }: Props) {
  // 날짜(YYYY-MM-DD)와 시간(hh:mm) 분리 관리
  const [date, setDate] = useState<string>('');
  const [time, setTime] = useState<string>('');
  const [stringTypes, setStringTypes] = useState<string[]>(initial.stringTypes ?? []);
  const [customStringType, setCustomStringType] = useState(initial.customStringName || '');
  const [racketType, setRacketType] = useState(initial.racketType || '');

  // 초기값이 있다면 분리
  useEffect(() => {
    if (initial.desiredDateTime) {
      const [datePart, timePart] = initial.desiredDateTime.split('T');
      setDate(datePart);
      setTime(timePart);
    }
  }, [initial.desiredDateTime]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !time) {
      showErrorToast('날짜와 시간을 모두 선택해주세요.');
      return;
    }
    try {
      const res = await fetch(`/api/applications/stringing/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          stringDetails: {
            desiredDateTime: `${date}T${time}`,
            stringTypes,
            customStringName: customStringType || null,
            racketType,
          },
        }),
      });
      if (!res.ok) throw new Error('네트워크 오류');
      showSuccessToast('스트링 정보가 수정되었습니다.');
      mutateData();
      mutateHistory();
      onDone();
    } catch (err) {
      console.error(err);
      showErrorToast('수정에 실패했습니다.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 날짜 선택 */}
      <div>
        <Label htmlFor="desiredDate">교체 희망일</Label>
        <Input id="desiredDate" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      </div>

      {/* 시간 슬롯 선택 (예약 가능/불가 반영) */}
      <TimeSlotSelector selected={time} selectedDate={date} onSelect={setTime} />

      {/* 스트링 선택 */}
      {/* 스트링 종류 (체크박스) */}
      <div className="space-y-2">
        <Label>스트링 종류</Label>
        <StringCheckboxes items={stringOptions} stringTypes={stringTypes} customInput={customStringType} onChange={setStringTypes} onCustomInputChange={setCustomStringType} />
        <p className="text-xs text-muted-foreground">※ 두 개 이상의 스트링을 교체 원하신 경우, “직접 입력”을 선택하세요.</p>
      </div>

      {/* 라켓 종류 입력 */}
      <div>
        <Label htmlFor="racketType">라켓 종류</Label>
        <Input id="racketType" type="text" value={racketType} onChange={(e) => setRacketType(e.target.value)} placeholder="예: Yonex EZONE 98" required />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit">저장</Button>
        <Button variant="outline" type="button" onClick={onDone}>
          취소
        </Button>
      </div>
    </form>
  );
}
