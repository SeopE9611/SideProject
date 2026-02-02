'use client';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { useUnsavedChangesGuard } from '@/lib/hooks/useUnsavedChangesGuard';

// dirty 비교용 시그니처(운송장 번호는 공백/하이픈 제거한 값 기준으로 비교)
const shippingSig = (v: { courier: string; tracking: string; date: string }) =>
  JSON.stringify({
    courier: String(v.courier ?? ''),
    tracking: String(v.tracking ?? '')
      .replaceAll('-', '')
      .replaceAll(' ', ''),
    date: String(v.date ?? ''),
  });

export default function ShippingForm({ rentalId }: { rentalId: string }) {
  const [courier, setCourier] = useState('');
  const [tracking, setTracking] = useState('');
  const [date, setDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [hasExisting, setHasExisting] = useState(false);

  // 프리필(초기 로드) 기준선(baseline)
  const [initialSig, setInitialSig] = useState('');
  // 저장 성공 후 뒤로가기 시 confirm 뜨지 않게 가드 제어
  const [guardOn, setGuardOn] = useState(true);

  const currentSig = useMemo(() => shippingSig({ courier, tracking, date }), [courier, tracking, date]);
  const isDirty = Boolean(initialSig) && currentSig !== initialSig;
  useUnsavedChangesGuard(guardOn && isDirty);

  // 프리필(수정용): GET /api/rentals/[id] 읽어서 shipping.outbound 있으면 기본값 세팅
  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/rentals/${rentalId}`, { credentials: 'include' });
      const json = await res.json().catch(() => ({}));
      const out = json?.shipping?.outbound;
      const next = {
        courier: out?.courier || '',
        tracking: out?.trackingNumber || '',
        date: out?.shippedAt ? String(out.shippedAt).slice(0, 10) : '',
      };
      setCourier(next.courier);
      setTracking(next.tracking);
      setDate(next.date);
      // baseline은 “로드 완료 시점” 값으로 1회만 세팅
      setInitialSig((sig) => sig || shippingSig(next));
      setHasExisting(true);
    })();
  }, [rentalId]);

  const onSave = async () => {
    if (!courier) return showErrorToast('택배사를 선택해주세요');
    if (!tracking) return showErrorToast('운송장 번호를 입력해주세요');
    setBusy(true);
    const res = await fetch(`/api/admin/rentals/${rentalId}/shipping/outbound`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ courier, trackingNumber: tracking.replaceAll('-', '').replaceAll(' ', ''), shippedAt: date }),
    });
    setBusy(false);
    if (!res.ok) return showErrorToast('등록 실패');
    showSuccessToast('출고 운송장을 저장했습니다');

    /**
     * 저장 성공 후 뒤로가기 UX
     * - guard가 켜져 있으면(popstate confirm) 저장 직후에도 경고가 뜰 수 있음
     * - guardOn=false로 내려서 훅 cleanup이 더미 히스토리를 먼저 정리(back 1회)
     * - 그 다음 tick에서 실제로 이전 페이지로 back (back 1회 추가)
     */
    setGuardOn(false);
    setTimeout(() => history.back(), 0);
  };

  return (
    <div className="max-w-xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>출고 운송장 {hasExisting ? '수정' : '등록'}</CardTitle>
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
            <Input value={tracking} onChange={(e) => setTracking(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>출고일(선택)</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={onSave} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} 저장
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
