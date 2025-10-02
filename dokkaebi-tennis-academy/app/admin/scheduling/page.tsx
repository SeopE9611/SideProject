'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Clock, Users, Settings2, Plus, Trash2, Pencil, Save, Info } from 'lucide-react';

// shadcn/ui
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';

// Toast
import { toast } from 'sonner';
import { showErrorToast, showInfoToast, showSuccessToast } from '@/lib/toast';

// ====== 브랜드 컬러 (여기만 바꾸면 전체 버튼/뱃지 톤이 바뀜)
const BRAND = {
  bg: 'bg-indigo-600',
  bgHover: 'hover:bg-indigo-700',
  text: 'text-white',
  softBg: 'bg-indigo-50',
  softText: 'text-indigo-700',
  ring: 'ring-indigo-100',
};

type ExceptionItem = {
  date: string;
  closed?: boolean;
  start?: string;
  end?: string;
  interval?: number;
  capacity?: number;
};

type StringingSettings = {
  _id: 'stringingSlots';
  capacity?: number;
  businessDays?: number[]; // 0~6
  start?: string;
  end?: string;
  interval?: number;
  holidays?: string[];
  exceptions?: ExceptionItem[];
  updatedAt?: string;
};

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

export default function StringingSettingsPage() {
  // 기본 설정
  const [capacity, setCapacity] = useState<number>(1);
  const [start, setStart] = useState<string>('10:00');
  const [end, setEnd] = useState<string>('19:00');
  const [interval, setInterval] = useState<number>(30);

  // 요일/휴무/예외
  const [businessDays, setBusinessDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [holidays, setHolidays] = useState<string[]>([]);
  const [exceptions, setExceptions] = useState<ExceptionItem[]>([]);

  // 입력 보조
  const [holidayInput, setHolidayInput] = useState('');
  const [exInput, setExInput] = useState<ExceptionItem>({ date: '' });

  // 상태
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 초기 로드
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/settings/stringing', { credentials: 'include', cache: 'no-store' });
        if (!res.ok) throw new Error('권한 또는 네트워크 오류');
        const data: StringingSettings | null = await res.json();
        if (data) {
          setCapacity(Number(data.capacity ?? 1));
          setStart(String(data.start ?? '10:00'));
          setEnd(String(data.end ?? '19:00'));
          setInterval(Number(data.interval ?? 30));
          setBusinessDays(Array.isArray(data.businessDays) ? data.businessDays : [1, 2, 3, 4, 5]);
          setHolidays(Array.isArray(data.holidays) ? data.holidays : []);
          setExceptions(Array.isArray(data.exceptions) ? data.exceptions : []);
        }
      } catch (err: any) {
        showErrorToast(err?.message || '설정을 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // 저장
  async function save() {
    setSaving(true);
    try {
      const payload: Partial<StringingSettings> = {
        capacity,
        start,
        end,
        interval,
        businessDays,
        holidays,
        exceptions,
      };
      const res = await fetch('/api/admin/settings/stringing', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.message || '저장 실패');
      }
      showSuccessToast('저장되었습니다. 새 예약/제출부터 즉시 반영됩니다.');
    } catch (err: any) {
      showErrorToast(err?.message || '저장 실패');
    } finally {
      setSaving(false);
    }
  }

  function resetToDefaults() {
    setCapacity(1);
    setStart('10:00');
    setEnd('19:00');
    setInterval(30);
    setBusinessDays([1, 2, 3, 4, 5]);
    setHolidays([]);
    setExceptions([]);
    showInfoToast('기본값으로 되돌렸습니다. 저장 시 적용됩니다.');
  }

  const sortedHolidays = useMemo(() => [...holidays].sort(), [holidays]);
  const sortedExceptions = useMemo(() => [...exceptions].sort((a, b) => a.date.localeCompare(b.date)), [exceptions]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="h-8 w-56 animate-pulse rounded-md bg-gray-200" />
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="h-64 animate-pulse rounded-2xl bg-white shadow-md ring-1 ring-black/5" />
          <div className="h-64 animate-pulse rounded-2xl bg-white shadow-md ring-1 ring-black/5" />
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={120}>
      <div className="p-6">
        {/* 헤더 */}
        <div className="mb-4 flex items-center gap-3">
          <Settings2 className="h-6 w-6 text-gray-800" />
          <h1 className="text-2xl font-semibold tracking-tight">스트링 예약 · 영업일 설정</h1>
        </div>

        <div className={`mb-6 rounded-2xl ${BRAND.ring} bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70 px-5 py-4 shadow-sm ring-1`}>
          <div className="flex items-start gap-3">
            <div className={`${BRAND.softBg} ${BRAND.softText} mt-0.5 rounded-full p-1.5`}>
              <Info className="h-4 w-4" />
            </div>
            <div className="text-[13px] leading-6 text-gray-800">
              <p className="font-medium">
                운영 정책 변경은 예약에 큰 영향을 줍니다. <b>변경 전 개발자/운영팀과 상의</b>하세요.
              </p>
              <ul className="mt-1 list-disc pl-5">
                <li>
                  <b>동시 수용량</b>: 같은 시간대 동시 접수 가능한 신청 수.
                </li>
                <li>
                  <b>영업 시간/간격</b>: 슬롯의 시작·종료 시각과 간격.
                </li>
                <li>
                  <b>영업 요일</b>: 기본 영업 요일.
                </li>
                <li>
                  <b>휴무일</b>: 특정 날짜를 휴무로 지정.
                </li>
                <li>
                  <b>예외일</b>: 특정 날짜만 영업/시간·간격·수용량을 오버라이드.
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* 기본 슬롯 설정 */}
          <Card className="rounded-2xl bg-white shadow-md ring-1 ring-black/5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-[15px]">
                <Clock className="h-5 w-5 text-gray-700" />
                기본 슬롯 설정
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* capacity */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <Label className="text-sm">동시 수용량</Label>
                  <span className={`rounded-md px-2 py-0.5 text-xs ${BRAND.softBg} ${BRAND.softText}`}>{capacity}명</span>
                </div>
                <Slider value={[capacity]} onValueChange={(v) => setCapacity(Math.max(1, Math.min(10, v?.[0] ?? 1)))} min={1} max={10} step={1} className="mt-2" />
                <p className="mt-1 text-xs text-muted-foreground">예) 2로 저장하면 동일 시간대 최대 2건까지 접수됩니다.</p>
              </div>

              {/* start / end */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="start">영업 시작</Label>
                  <Input id="start" type="time" value={start} onChange={(e) => setStart(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="end">영업 종료</Label>
                  <Input id="end" type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
                </div>
              </div>

              {/* interval */}
              <div>
                <Label htmlFor="interval">간격(분, 5~240)</Label>
                <div className="mt-2 flex items-center gap-3">
                  <Input
                    id="interval"
                    type="number"
                    min={5}
                    max={240}
                    value={interval}
                    onChange={(e) => {
                      const v = Number(e.target.value || 30);
                      if (Number.isFinite(v)) setInterval(Math.max(5, Math.min(240, v)));
                    }}
                    className="w-28"
                  />
                  <Badge variant="outline" className="border-dashed">
                    예: 30분 → 10:00,10:30…
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 영업 요일 / 휴무일 */}
          <Card className="rounded-2xl bg-white shadow-md ring-1 ring-black/5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-[15px]">
                <CalendarDays className="h-5 w-5 text-gray-700" />
                영업 요일 · 휴무일
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* businessDays */}
              <div>
                <Label className="mb-2 block text-sm">영업 요일</Label>
                <div className="grid grid-cols-7 gap-2">
                  {DAY_LABELS.map((label, i) => {
                    const on = businessDays.includes(i);
                    return (
                      <Button
                        key={i}
                        type="button"
                        variant={on ? 'default' : 'outline'}
                        className={on ? `${BRAND.bg} ${BRAND.bgHover} ${BRAND.text} shadow-sm` : 'bg-white text-gray-800 hover:bg-gray-50'}
                        onClick={() => setBusinessDays((prev) => (prev.includes(i) ? prev.filter((d) => d !== i) : [...prev, i].sort()))}
                      >
                        {label}
                      </Button>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">예외일로 별도 지정한 날짜는 이 요일 설정과 무관하게 동작합니다.</p>
              </div>

              <Separator />

              {/* holidays */}
              <div>
                <Label className="mb-2 block text-sm">휴무일</Label>
                <div className="flex items-center gap-2">
                  <Input type="date" value={holidayInput} onChange={(e) => setHolidayInput(e.target.value)} className="max-w-[200px]" />
                  <Button
                    type="button"
                    className={`${BRAND.bg} ${BRAND.bgHover} ${BRAND.text}`}
                    onClick={() => {
                      if (!holidayInput) return;
                      if (!holidays.includes(holidayInput)) setHolidays([...holidays, holidayInput]);
                      setHolidayInput('');
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" /> 추가
                  </Button>
                </div>

                {sortedHolidays.length > 0 ? (
                  <ul className="mt-4 divide-y rounded-xl bg-white shadow-sm ring-1 ring-black/5">
                    {sortedHolidays.map((h) => (
                      <li key={h} className="flex items-center justify-between px-3 py-2 text-sm">
                        <span className="font-medium">{h}</span>
                        <Button type="button" variant="ghost" className="hover:bg-red-50" onClick={() => setHolidays((prev) => prev.filter((x) => x !== h))}>
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">등록된 휴무일이 없습니다.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 예외일 카드 */}
        <Card className="mt-6 rounded-2xl bg-white shadow-md ring-1 ring-black/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-[15px]">
              <Users className="h-5 w-5 text-gray-700" />
              예외일 (특별 운영/휴무)
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* 입력 폼 */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
              <div className="lg:col-span-2">
                <Label className="text-xs">날짜</Label>
                <Input type="date" value={exInput.date || ''} onChange={(e) => setExInput({ ...exInput, date: e.target.value })} />
              </div>

              <div className="flex items-center gap-2 pt-6">
                <Switch checked={!!exInput.closed} onCheckedChange={(v) => setExInput({ ...exInput, closed: v })} id="ex-closed" />
                <Label htmlFor="ex-closed" className="text-sm">
                  해당 날짜 휴무
                </Label>
              </div>

              <div>
                <Label className="text-xs">시작</Label>
                <Input type="time" value={exInput.start || ''} onChange={(e) => setExInput({ ...exInput, start: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">종료</Label>
                <Input type="time" value={exInput.end || ''} onChange={(e) => setExInput({ ...exInput, end: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">간격(분)</Label>
                <Input type="number" min={5} max={240} value={exInput.interval ?? ''} onChange={(e) => setExInput({ ...exInput, interval: Number(e.target.value) || undefined })} />
              </div>
              <div>
                <Label className="text-xs">수용량</Label>
                <Input type="number" min={1} max={10} value={exInput.capacity ?? ''} onChange={(e) => setExInput({ ...exInput, capacity: Number(e.target.value) || undefined })} />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                className={`${BRAND.bg} ${BRAND.bgHover} ${BRAND.text}`}
                onClick={() => {
                  if (!exInput.date) {
                    showErrorToast('날짜는 필수입니다.');
                    return;
                  }
                  setExceptions((prev) => {
                    const rest = prev.filter((x) => x.date !== exInput.date);
                    return [...rest, { ...exInput }];
                  });
                  setExInput({ date: '' });
                  showSuccessToast('예외일이 추가/수정되었습니다.');
                }}
              >
                <Pencil className="mr-2 h-4 w-4" /> 예외일 추가/수정
              </Button>
              <Button type="button" variant="secondary" onClick={() => setExInput({ date: '' })}>
                입력 초기화
              </Button>
            </div>

            {/* 리스트 */}
            {sortedExceptions.length > 0 ? (
              <ul className="mt-2 divide-y rounded-xl bg-white shadow-sm ring-1 ring-black/5">
                {sortedExceptions.map((ex) => (
                  <li key={ex.date} className="flex items-start justify-between gap-3 px-3 py-2">
                    <div>
                      <div className="font-medium">{ex.date}</div>
                      {ex.closed ? (
                        <div className="text-red-600 text-sm">휴무</div>
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          {ex.start && ex.end ? `${ex.start} ~ ${ex.end}` : '시간 미지정(기본값 사용)'}
                          {typeof ex.interval === 'number' && ` · 간격 ${ex.interval}분`}
                          {typeof ex.capacity === 'number' && ` · 수용 ${ex.capacity}명`}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" onClick={() => setExInput(ex)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="hover:bg-red-50" onClick={() => setExceptions((prev) => prev.filter((x) => x.date !== ex.date))}>
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">등록된 예외일이 없습니다.</p>
            )}
          </CardContent>

          <CardFooter className="flex justify-end gap-2">
            <Button onClick={save} disabled={saving} className={`${BRAND.bg} ${BRAND.bgHover} ${BRAND.text}`}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? '저장 중…' : '저장'}
            </Button>
            <Button variant="outline" onClick={resetToDefaults}>
              기본값으로
            </Button>
          </CardFooter>
        </Card>
      </div>
    </TooltipProvider>
  );
}
