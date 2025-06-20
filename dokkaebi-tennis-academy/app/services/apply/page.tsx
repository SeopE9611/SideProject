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
import { useAuthStore } from '@/lib/stores/auth-store';
export default function StringServiceApplyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    racketType: '',
    stringType: '',
    customStringType: '',
    preferredDate: '',
    preferredTime: '',
    requirements: '',
  });

  // 주문 데이터 신청자 정보 불러오기
  useEffect(() => {
    if (!orderId) return;

    const fetchOrder = async () => {
      try {
        const orderRes = await fetch(`/api/orders/${orderId}`);
        const orderData = await orderRes.json();
        setOrder(orderData);

        // accessToken 꺼내기
        const token = useAuthStore.getState().accessToken;

        const userRes = await fetch('/api/users/me', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        const userData = await userRes.json();

        setFormData((prev) => ({
          ...prev,
          name: orderData.shippingInfo?.name ?? '',
          phone: orderData.shippingInfo?.phone ?? '',
          email: userData.email ?? '',
        }));
      } catch (err) {
        console.error('정보 fetch 실패:', err);
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

    // 공통 필수 필드만 먼저 검증
    if (!formData.name || !formData.phone || !formData.racketType || !formData.preferredDate) {
      showErrorToast('필수 항목을 모두 입력해주세요.');
      return;
    }

    // 스트링 종류 선택 여부 검증
    if (!formData.stringType.trim()) {
      showErrorToast('스트링 종류를 선택해주세요.');
      return;
    }

    // 직접입력 선택 시 입력 필드 값도 필수
    if (formData.stringType === 'custom' && !formData.customStringType.trim()) {
      showErrorToast('스트링 종류를 직접 입력해주세요.');
      return;
    }

    // 연락처 정제
    const cleaned = formData.phone.replace(/[^0-9]/g, '');
    if (!/^010\d{8}$/.test(cleaned)) {
      showErrorToast('연락처는 010으로 시작하는 숫자 11자리로 입력해주세요. 예: 01012345678');
      return;
    }

    setIsSubmitting(true);

    const stringToSave = formData.stringType === 'custom' ? formData.customStringType.trim() : formData.stringType.trim();

    const payload = {
      name: formData.name,
      email: formData.email,
      phone: cleaned,
      racketType: formData.racketType,
      stringType: formData.stringType,
      customStringName: formData.stringType === 'custom' ? formData.customStringType.trim() : null,
      preferredDate: formData.preferredDate,
      preferredTime: formData.preferredTime,
      requirements: formData.requirements,
      orderId,
    };

    try {
      const res = await fetch('/api/applications/stringing/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
  // console.log('formData.preferredDate:', formData.preferredDate);

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
              <div className="space-y-8">
                {/* 신청자 정보 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">📌 신청자 정보</CardTitle>
                    <CardDescription className="text-sm leading-relaxed text-orange-600">
                      <span className="font-medium">📢 안내:</span> 신청자 정보는 <span className="font-semibold">주문 당시 정보</span>를 기준으로 작성됩니다. 회원정보를 수정하셨더라도{' '}
                      <span className="font-semibold">신청자 정보는 변경되지 않습니다.</span>
                      <br />
                      변경이 필요한 경우, <span className="text-primary font-semibold">요청사항</span>에 기재해주세요.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* 이름 */}
                    <div className="space-y-2">
                      <Label htmlFor="name">신청인 이름</Label>
                      <Input id="name" name="name" value={formData.name} readOnly className="bg-muted text-muted-foreground cursor-not-allowed" />
                    </div>

                    {/* 이메일 */}
                    <div className="space-y-2">
                      <Label htmlFor="email">이메일</Label>
                      <Input id="email" name="email" value={formData.email} readOnly className="bg-muted text-muted-foreground cursor-not-allowed" />
                    </div>

                    {/* 연락처 */}
                    <div className="space-y-2">
                      <Label htmlFor="phone">연락처</Label>
                      <Input id="phone" name="phone" value={formData.phone} readOnly className="bg-muted text-muted-foreground cursor-not-allowed" />
                    </div>
                  </CardContent>
                </Card>

                {/* 장착 정보 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">🎾 장착 정보</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* 라켓 */}
                    <div className="space-y-2">
                      <Label htmlFor="racketType">
                        라켓 종류 <span className="text-red-500">*</span>
                      </Label>
                      <Input id="racketType" name="racketType" value={formData.racketType} onChange={handleInputChange} placeholder="예: 윌슨 프로 스태프 97" />
                    </div>

                    {/* 스트링 */}
                    <div className="space-y-2">
                      <Label>
                        스트링 종류 <span className="text-red-500">*</span>
                      </Label>
                      <p className="text-sm text-muted-foreground text-red-500">※ 두 개 이상의 스트링을 교체 원하신 경우, 직접 입력하기를 선택하여 아래에 상세히 적어주세요.</p>
                      <p className="text-sm text-muted-foreground text-red-500">※ 이미 보유하고 계신 스트링으로 작성하셔도 됩니다.</p>
                      <StringSelector
                        items={order?.items ?? []}
                        selected={formData.stringType}
                        customInput={formData.customStringType}
                        onSelect={(value) => setFormData((prev) => ({ ...prev, stringType: value }))}
                        onCustomInputChange={(value) => setFormData((prev) => ({ ...prev, customStringType: value }))}
                      />
                    </div>

                    {/* 희망일 */}
                    <div className="space-y-2">
                      <Label htmlFor="preferredDate">
                        장착 희망일 <span className="text-red-500">*</span>
                      </Label>
                      <Input id="preferredDate" name="preferredDate" type="date" value={formData.preferredDate} onChange={handleInputChange} min={new Date().toISOString().split('T')[0]} />
                    </div>

                    {/* 희망 시간대 */}
                    <TimeSlotSelector selected={formData.preferredTime} selectedDate={formData.preferredDate} onSelect={(value) => setFormData((prev) => ({ ...prev, preferredTime: value }))} />
                  </CardContent>
                </Card>

                {/* 요청사항 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">📝 추가 요청사항</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-muted-foreground text-red-500">※ 두 개 이상의 라켓 또는 스트링을 신청하신 경우, 장착 요청 내용을 아래에 자세히 적어주세요.</p>
                    <Textarea id="requirements" name="requirements" value={formData.requirements} onChange={handleInputChange} placeholder="예: 첫 번째 라켓에는 RPM Blast, 두 번째 라켓에는 Xcel 장착 요청" rows={4} className="resize-none" />
                  </CardContent>
                </Card>

                {/* 제출 버튼 */}
                <Button type="submit" disabled={isSubmitting} className="w-full h-12 text-lg font-medium">
                  {isSubmitting ? '신청서 제출 중...' : '신청서 제출하기'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
