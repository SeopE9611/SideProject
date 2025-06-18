'use client';

import type React from 'react';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { showErrorToast } from '@/lib/toast';
import { useSearchParams } from 'next/navigation';
import StringSelector from '@/app/services/_components/StringSelector';
import { Order } from '@/lib/types/order';
import PreferredTimeSelector from '@/app/services/_components/TimeSlotSelector';
import TimeSlotSelector from '@/app/services/_components/TimeSlotSelector';
export default function StringServiceApplyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    racketType: '',
    stringType: '',
    preferredDate: '',
    preferredTime: '',
    requirements: '',
  });

  // 주문 데이터 fetch + formData 초기화
  useEffect(() => {
    if (!orderId) return;

    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}`);
        const data = await res.json();

        setOrder(data);
        setFormData((prev) => ({
          ...prev,
          name: data.shippingInfo?.name ?? '',
          phone: data.shippingInfo?.phone ?? '',
        }));
      } catch (err) {
        console.error('주문 정보 fetch 실패:', err);
      }
    };

    fetchOrder();
  }, [orderId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 필수 필드 검증
    if (!formData.name || !formData.phone || !formData.racketType || !formData.stringType || !formData.preferredDate) {
      showErrorToast('필수 항목을 모두 입력해주세요.');
      return;
    }

    // 전화번호 형식 검증
    const cleaned = formData.phone.replace(/[^0-9]/g, ''); // 숫자만 남김

    // 숫자 11자리 아니면 에러
    if (!/^010\d{8}$/.test(cleaned)) {
      showErrorToast('연락처는 010으로 시작하는 숫자 11자리로 입력해주세요. 예: 01012345678');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/applications/stringing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, phone: cleaned, orderId }),
      });

      if (!res.ok) {
        const { message } = await res.json();
        throw new Error(message || '신청 실패');
      }

      toast.success('신청이 완료되었습니다!');
      router.push('/services/success');
    } catch (error) {
      showErrorToast('신청서 제출 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };
  // console.log('📅 formData.preferredDate:', formData.preferredDate);

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">스트링 장착 서비스 신청</CardTitle>
            <CardDescription className="text-center text-gray-600">전문가가 직접 라켓에 스트링을 장착해드립니다. 신청서를 작성해주시면 빠르게 연락드리겠습니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 신청인 이름 */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  신청인 이름 <span className="text-red-500">*</span>
                </Label>
                <Input id="name" name="name" type="text" value={formData.name} onChange={handleInputChange} placeholder="이름을 입력해주세요" required className="w-full" />
              </div>

              {/* 연락처 */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium">
                  연락처 <span className="text-red-500">*</span>
                </Label>
                <Input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleInputChange} placeholder="ex) 01012345678" required className="w-full" />
              </div>

              {/* 라켓 종류 */}
              <div className="space-y-2">
                <Label htmlFor="racketType" className="text-sm font-medium">
                  라켓 종류 <span className="text-red-500">*</span>
                </Label>
                <Input id="racketType" name="racketType" type="text" value={formData.racketType} onChange={handleInputChange} placeholder="예: 윌슨 프로 스태프 97" required className="w-full" />
              </div>

              {/* 스트링 종류 */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  스트링 종류 <span className="text-red-500">*</span>
                </Label>
                <StringSelector items={order?.items ?? []} selected={formData.stringType} onSelect={(value) => setFormData((prev) => ({ ...prev, stringType: value }))} />
              </div>

              {/* 장착 희망일 */}
              <div className="space-y-2">
                <Label htmlFor="preferredDate" className="text-sm font-medium">
                  장착 희망일 <span className="text-red-500">*</span>
                </Label>
                <Input id="preferredDate" name="preferredDate" type="date" value={formData.preferredDate} onChange={handleInputChange} required className="w-full" min={new Date().toISOString().split('T')[0]} />
              </div>

              {/* 장착 희망 시간대 */}

              <TimeSlotSelector selected={formData.preferredTime} selectedDate={formData.preferredDate} onSelect={(value) => setFormData((prev) => ({ ...prev, preferredTime: value }))} />

              {/* 요청사항 */}
              <div className="space-y-2">
                <Label htmlFor="requirements" className="text-sm font-medium">
                  요청사항
                </Label>
                <Textarea id="requirements" name="requirements" value={formData.requirements} onChange={handleInputChange} placeholder="요청사항이 있다면 작성해주세요" rows={4} className="w-full resize-none" />
              </div>

              {/* 제출 버튼 */}
              <Button type="submit" disabled={isSubmitting} className="w-full h-12 text-lg font-medium">
                {isSubmitting ? '신청서 제출 중...' : '신청서 제출하기'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
