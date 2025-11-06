'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Truck } from 'lucide-react';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { useRouter } from 'next/navigation';

export default function ReturnShippingForm({ rentalId }: { rentalId: string }) {
  const [courier, setCourier] = useState('');
  const [tracking, setTracking] = useState('');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const onSubmit = async () => {
    if (!courier) return showErrorToast('택배사를 입력하세요');
    if (!tracking) return showErrorToast('운송장 번호를 입력하세요');

    setBusy(true);
    const res = await fetch(`/api/rentals/${rentalId}/return-shipping`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ courier, trackingNumber: tracking, shippedAt: date, note }),
    });
    setBusy(false);
    if (!res.ok) return showErrorToast('등록 실패');
    showSuccessToast('반납 운송장을 등록했습니다');
    router.back();
  };

  return (
    <div className="max-w-xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" /> 반납 운송장 등록
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>택배사</Label>
            <Input value={courier} onChange={(e) => setCourier(e.target.value)} placeholder="예: CJ대한통운" />
          </div>
          <div className="space-y-2">
            <Label>운송장 번호</Label>
            <Input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="예: 1234-5678-..." />
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
