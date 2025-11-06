'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { useRouter } from 'next/navigation';

export default function ShippingForm({ rentalId }: { rentalId: string }) {
  const [courier, setCourier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [date, setDate] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const onSubmit = async () => {
    if (!courier) return showErrorToast('택배사를 선택해주세요');
    if (!trackingNumber) return showErrorToast('운송장 번호를 입력해주세요');

    setBusy(true);
    const res = await fetch(`/api/admin/rentals/${rentalId}/shipping/outbound`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ courier, trackingNumber, shippedAt: date }),
    });
    setBusy(false);

    if (!res.ok) return showErrorToast('등록 실패');
    showSuccessToast('출고 운송장을 등록했습니다');
    router.back();
  };

  return (
    <div className="max-w-xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>출고 운송장 등록</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>택배사</Label>
            <Select value={courier} onValueChange={setCourier}>
              <SelectTrigger>
                <SelectValue placeholder="택배사를 선택하세요" />
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
            <Input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>출고일(선택)</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={onSubmit} disabled={busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 저장
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
