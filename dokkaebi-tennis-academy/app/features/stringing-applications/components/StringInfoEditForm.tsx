'use client';

import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { showSuccessToast, showErrorToast } from '@/lib/toast';
import { format, parseISO } from 'date-fns';
import TimeSlotSelector from '@/app/services/_components/TimeSlotSelector';
import StringCheckboxes from '@/app/services/_components/StringCheckboxes';
import { Switch } from '@/components/ui/switch';

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

  // 섹션 on off 상태
  const [enableTime, setEnableTime] = useState(false);
  const [enableRacket, setEnableRacket] = useState(false);
  const [enableStrings, setEnableStrings] = useState(false);

  // 토글 핸들러: OFF 시 초기값 복원
  const handleTimeToggle = (on: boolean) => {
    setEnableTime(on);
    if (!on && initial.desiredDateTime) {
      const [origDate, origTime] = initial.desiredDateTime.split('T');
      setDate(origDate);
      setTime(origTime);
    }
  };
  const handleStringsToggle = (on: boolean) => {
    setEnableStrings(on);
    if (!on) {
      setStringTypes(initial.stringTypes ?? []);
      setCustomStringType(initial.customStringName ?? '');
    }
  };
  const handleRacketToggle = (on: boolean) => {
    setEnableRacket(on);
    if (!on) {
      setRacketType(initial.racketType ?? '');
    }
  };

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
    if (enableTime && (!date || !time)) {
      showErrorToast('날짜와 시간을 모두 선택해주세요.');
      return;
    }
    try {
      const payload: any = { stringDetails: {} };
      if (enableTime) {
        payload.stringDetails.desiredDateTime = `${date}T${time}`;
      }
      if (enableStrings) {
        payload.stringDetails.stringTypes = stringTypes;
        payload.stringDetails.customStringName = customStringType || null;
      }
      if (enableRacket) {
        payload.stringDetails.racketType = racketType;
      }
      const res = await fetch(`/api/applications/stringing/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
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
      {/* 시간 예약 섹션 */}
      <div className="flex items-center justify-between">
        <Label>교체 희망일/시간</Label>
        <Switch checked={enableTime} onCheckedChange={handleTimeToggle} />
      </div>
      <div className={enableTime ? '' : 'opacity-50 pointer-events-none'}>
        <Input id="desiredDate" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        <TimeSlotSelector selected={time} selectedDate={date} onSelect={setTime} />
      </div>

      {/* 스트링 선택 섹션 */}
      <div className="flex items-center justify-between mt-4">
        <Label>스트링 종류</Label>
        <Switch checked={enableStrings} onCheckedChange={handleStringsToggle} />
      </div>
      <div className={enableStrings ? '' : 'opacity-50 pointer-events-none'}>
        <StringCheckboxes
          items={stringOptions}
          stringTypes={stringTypes}
          customInput={customStringType}
          onChange={setStringTypes}
          onCustomInputChange={setCustomStringType}
          disabled={!enableStrings} // 새로 추가된 prop
        />
        <p className="text-xs text-muted-foreground">※ 두 개 이상의 스트링을 교체 원하신 경우, “직접 입력”을 선택하세요.</p>
      </div>

      {/* 라켓 종류 섹션 */}
      <div className="flex items-center justify-between mt-4">
        <Label htmlFor="racketType">라켓 종류</Label>
        <Switch checked={enableRacket} onCheckedChange={handleRacketToggle} />
      </div>
      <Input
        id="racketType"
        type="text"
        value={racketType}
        onChange={(e) => setRacketType(e.target.value)}
        placeholder="예: Yonex EZONE 98"
        required
        disabled={!enableRacket} // disabled prop 직접 추가
      />

      {/* 저장/취소 버튼 */}
      <div className="flex justify-end gap-2">
        <Button type="submit">저장</Button>
        <Button variant="outline" type="button" onClick={onDone}>
          취소
        </Button>
      </div>
    </form>
  );
}
