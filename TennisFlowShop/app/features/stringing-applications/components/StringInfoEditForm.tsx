'use client';

import { useState, useEffect, useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { showSuccessToast, showErrorToast } from '@/lib/toast';
import { format, parseISO } from 'date-fns';
import TimeSlotSelector from '@/app/services/_components/TimeSlotSelector';
import StringCheckboxes from '@/app/services/_components/StringCheckboxes';
import { Switch } from '@/components/ui/switch';
import { UNSAVED_CHANGES_MESSAGE, useUnsavedChangesGuard } from '@/lib/hooks/useUnsavedChangesGuard';

interface Props {
  id: string;
  initial: {
    desiredDateTime?: string; // "YYYY-MM-DDThh:mm"
    stringTypes?: string[];
    racketType?: string;
    customStringName?: string;
  };
  fields?: Array<'desiredDateTime' | 'stringType' | 'racketType'>;
  stringOptions: { id: string; name: string; mountingFee: number }[];
  onDone: () => void;
  mutateData: () => void;
  mutateHistory: () => void;
}

export default function StringInfoEditForm({ id, initial, stringOptions, onDone, mutateData, mutateHistory, fields = ['desiredDateTime', 'stringType', 'racketType'] }: Props) {
  // 날짜(YYYY-MM-DD)와 시간(hh:mm) 분리 관리
  const [date, setDate] = useState<string>('');
  const [time, setTime] = useState<string>('');
  const [stringTypes, setStringTypes] = useState<string[]>(initial.stringTypes ?? []);
  const [customStringType, setCustomStringType] = useState(initial.customStringName || '');
  const [racketType, setRacketType] = useState(initial.racketType || '');
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 섹션 on off 상태
  const [enableTime, setEnableTime] = useState(false);
  const [enableRacket, setEnableRacket] = useState(false);
  const [enableStrings, setEnableStrings] = useState(false);

  // [추가] 유효 날짜 검사
  const isValidDate = (s: string | null | undefined): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);

  /**
   * ---- 이탈 경고(unsaved changes) ----
   * baseline(초기값) vs 현재 state 비교로 dirty 판단
   * - stringTypes는 “선택 집합” 개념이라 정렬 후 비교(순서 변동으로 인한 오탐 방지)
   */
  const baseline = useMemo(() => {
    const baseDesired = initial.desiredDateTime ?? '';
    const baseStrings = [...(initial.stringTypes ?? [])].sort();
    return {
      desiredDateTime: baseDesired,
      stringTypes: baseStrings,
      customStringName: initial.customStringName ?? '',
      racketType: initial.racketType ?? '',
    };
  }, [initial.desiredDateTime, initial.stringTypes, initial.customStringName, initial.racketType]);

  const isDirty = useMemo(() => {
    const curDesired = !date && !time ? '' : `${date}T${time}`;
    const curStrings = [...(stringTypes ?? [])].sort();
    const stringsChanged = curStrings.length !== baseline.stringTypes.length || curStrings.some((v, i) => v !== baseline.stringTypes[i]);

    return curDesired !== baseline.desiredDateTime || stringsChanged || (customStringType ?? '') !== baseline.customStringName || (racketType ?? '') !== baseline.racketType;
  }, [baseline, date, time, stringTypes, customStringType, racketType]);

  // 저장 중에는 confirm을 띄우지 않도록(UX)
  useUnsavedChangesGuard(isDirty && !isSubmitting);

  const handleCancel = () => {
    if (isDirty && !window.confirm(UNSAVED_CHANGES_MESSAGE)) return;
    onDone();
  };

  // 토글 핸들러: OFF 시 초기값 복원
  const handleTimeToggle = (on: boolean) => {
    setEnableTime(on);
    if (!on && initial.desiredDateTime) {
      const [origDate, origTime] = initial.desiredDateTime.split('T');
      setDate(origDate);
      setTime(origTime);
      setTimeSlots([]); // [추가] 비활성화 시 슬롯 클리어
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

  // [추가] 날짜가 바뀌면 백엔드에서 해당 날짜의 예약 가능 시간을 불러옴
  useEffect(() => {
    let abort = false;

    async function loadSlots() {
      if (!enableTime) {
        setTimeSlots([]);
        return;
      }
      if (!isValidDate(date)) {
        setTimeSlots([]);
        setTime('');
        return;
      }
      try {
        const res = await fetch(`/api/applications/stringing/reserved?date=${date}`, {
          cache: 'no-store',
        });
        if (!res.ok) throw new Error('시간대 조회 실패');
        const data = await res.json();
        if (abort) return;
        const slots: string[] = Array.isArray(data?.availableTimes) ? data.availableTimes : [];
        setTimeSlots(slots);

        // 현재 선택된 시간이 유효하지 않으면 초기화
        if (!slots.includes(time)) setTime('');
      } catch (e) {
        console.error('[TimeSlots] load error', e);
        if (!abort) {
          setTimeSlots([]);
          setTime('');
        }
      }
    }

    loadSlots();
    return () => {
      abort = true;
    };
  }, [date, enableTime]); // [추가]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (enableTime && (!date || !time)) {
      showErrorToast('날짜와 시간을 모두 선택해주세요.');
      return;
    }
    setIsSubmitting(true);
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
      setIsSubmitting(false);
      onDone();
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
      showErrorToast('수정에 실패했습니다.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 시간 예약 섹션 */}
      {fields.includes('desiredDateTime') && (
        <>
          <div className="flex items-center justify-between">
            <Label>교체 희망일/시간</Label>
            <Switch checked={enableTime} onCheckedChange={handleTimeToggle} />
          </div>
          <div className={enableTime ? '' : 'opacity-50 pointer-events-none'}>
            <Input id="desiredDate" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            <TimeSlotSelector selected={time} times={timeSlots} selectedDate={date} onSelect={setTime} />
            {/* [추가] 안내 문구 */}
            {enableTime && isValidDate(date) && timeSlots.length === 0 && <p className="text-xs text-muted-foreground mt-1">선택 가능한 시간이 없습니다. 날짜를 다시 선택해보세요.</p>}
          </div>
        </>
      )}
      {/* 스트링 선택 섹션 */}
      {fields.includes('stringType') && (
        <>
          <div className="flex items-center justify-between mt-4">
            <Label>스트링 종류</Label>
            <Switch checked={enableStrings} onCheckedChange={handleStringsToggle} />
          </div>
          <div className={enableStrings ? '' : 'opacity-50 pointer-events-none'}>
            <StringCheckboxes items={stringOptions} stringTypes={stringTypes} customInput={customStringType} onChange={setStringTypes} onCustomInputChange={setCustomStringType} disabled={!enableStrings} />
            <p className="text-xs text-muted-foreground">※ 두 개 이상의 스트링을 교체 원하신 경우, “직접 입력”을 선택하세요.</p>
          </div>
        </>
      )}
      {/* 라켓 종류 섹션 */}
      {fields.includes('racketType') && (
        <>
          <div className="flex items-center justify-between mt-4">
            <Label htmlFor="racketType">라켓 종류</Label>
            <Switch checked={enableRacket} onCheckedChange={handleRacketToggle} />
          </div>
          <Input id="racketType" type="text" value={racketType} onChange={(e) => setRacketType(e.target.value)} placeholder="예: Yonex EZONE 98" required disabled={!enableRacket} />
        </>
      )}

      {/* 저장/취소 버튼 */}
      <div className="flex justify-end gap-2">
        <Button type="submit">저장</Button>
        <Button variant="outline" type="button" onClick={handleCancel}>
          취소
        </Button>
      </div>
    </form>
  );
}
