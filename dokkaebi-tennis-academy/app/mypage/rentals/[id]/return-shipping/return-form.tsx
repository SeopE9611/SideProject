'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Truck } from 'lucide-react';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUnsavedChangesGuard } from '@/lib/hooks/useUnsavedChangesGuard';

// 서버 정규확 검증
const onlyDigits = (v: string) => v.replace(/\D/g, '');
const isValidTrackingDigits = (digits: string) => digits.length >= 9 && digits.length <= 20;

function formatFieldErrors(fieldErrors?: Record<string, string[] | undefined> | null) {
  if (!fieldErrors) return '';
  const lines: string[] = [];
  for (const [field, msgs] of Object.entries(fieldErrors)) {
    for (const msg of msgs ?? []) lines.push(`- ${field}: ${msg}`);
  }
  return lines.join('\n');
}

export default function ReturnShippingForm({ rentalId }: { rentalId: string }) {
  const [courier, setCourier] = useState('');
  const [tracking, setTracking] = useState('');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [hasExisting, setHasExisting] = useState(false);

  const [prefillDone, setPrefillDone] = useState(false);

  const confirmLeaveMessage = '이 페이지를 벗어날 경우 입력한 정보는 초기화됩니다.';
  const fingerprint = useMemo(() => JSON.stringify({ courier, tracking, date, note }), [courier, tracking, date, note]);
  const baselineRef = useRef<string | null>(null);
  const isDirty = useMemo(() => baselineRef.current !== null && baselineRef.current !== fingerprint, [fingerprint]);

  useEffect(() => {
    if (!prefillDone) return;
    if (baselineRef.current !== null) return;
    baselineRef.current = fingerprint;
  }, [prefillDone, fingerprint]);

useUnsavedChangesGuard(isDirty);

  // 프리필(수정 모드 지원)
  useEffect(() => {
    let cancelled = false;
    setPrefillDone(false);
    (async () => {
      try {
        const res = await fetch(`/api/rentals/${rentalId}`, { credentials: 'include' });
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        const ret = json?.shipping?.return;
        if (ret) {
          setCourier(ret.courier || '');
          setTracking(ret.trackingNumber || '');
          setDate(ret.shippedAt ? String(ret.shippedAt).slice(0, 10) : '');
          setNote(ret.note || '');
          setHasExisting(true);
        }
      } finally {
        if (!cancelled) setPrefillDone(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [rentalId]);

  const onSubmit = async () => {
    if (!courier) return showErrorToast('택배사를 입력하세요');
    // 운송장: 숫자만 + 9~20자리
    const trackingDigits = onlyDigits(tracking);
    if (!trackingDigits) return showErrorToast('운송장 번호를 입력하세요');
    if (!isValidTrackingDigits(trackingDigits)) return showErrorToast('운송장 번호는 숫자 9~20자리만 입력해주세요');

    // 메모: 200자 제한
    const noteTrimmed = note.trim();
    if (noteTrimmed.length > 200) return showErrorToast('메모는 200자 이내로 입력해주세요');

    setBusy(true);
    const res = await fetch(`/api/rentals/${rentalId}/return-shipping`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        courier,
        trackingNumber: trackingDigits,
        shippedAt: date || undefined,
        note: noteTrimmed || undefined,
      }),
    });
    setBusy(false);
    // 서버가 400에서 { error, fieldErrors }를 내려주면 그대로 노출
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = json?.error || json?.message || '등록 실패';
      const details = formatFieldErrors(json?.fieldErrors);
      return showErrorToast(details ? `${msg}\n${details}` : msg);
    }
    showSuccessToast('반납 운송장을 저장했습니다');
    history.back();
  };

  return (
    <div className="max-w-xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" /> 반납 운송장 {hasExisting ? '수정' : '등록'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>택배사</Label>
            <Select value={courier} onValueChange={setCourier}>
              <SelectTrigger>
                <SelectValue placeholder="택배사를 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cj">CJ대한통운</SelectItem>
                <SelectItem value="post">우체국</SelectItem>
                <SelectItem value="logen">로젠</SelectItem>
                <SelectItem value="hanjin">한진</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>운송장 번호</Label>
            <Input
              value={tracking}
              onChange={(e) => {
                // 입력 중에도 숫자만 유지 + 최대 20자리 제한
                const digits = onlyDigits(e.target.value).slice(0, 20);
                setTracking(digits);
              }}
              inputMode="numeric"
              placeholder="숫자만 입력 (9~20자리)"
            />
          </div>
          <div className="space-y-2">
            <Label>발송일(선택)</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>메모(선택)</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="택배 접수 지점 등" />
          </div>
          <Button onClick={onSubmit} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} 저장
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
