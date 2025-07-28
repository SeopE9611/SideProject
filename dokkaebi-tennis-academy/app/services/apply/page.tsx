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
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { useSearchParams } from 'next/navigation';
import StringSelector from '@/app/services/_components/StringCheckboxes';
import { Order } from '@/lib/types/order';
import PreferredTimeSelector from '@/app/services/_components/TimeSlotSelector';
import TimeSlotSelector from '@/app/services/_components/TimeSlotSelector';
import { useAuthStore } from '@/app/store/authStore';
import { getStringingServicePrice } from '@/lib/stringing-prices';
import { bankLabelMap } from '@/lib/constants';
import { useTokenRefresher } from '@/app/api/auth/useTokenRefresher';
import StringCheckboxes from '@/app/services/_components/StringCheckboxes';

declare global {
  interface Window {
    daum: any;
  }
}

export default function StringServiceApplyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [isMember, setIsMember] = useState(false); // 회원 여부 판단
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    racketType: '',
    stringTypes: [] as string[],
    customStringType: '',
    preferredDate: '',
    preferredTime: '',
    requirements: '',
    shippingName: '',
    shippingPhone: '',
    shippingEmail: '',
    shippingAddress: '',
    shippingAddressDetail: '',
    shippingPostcode: '',
    shippingDepositor: '',
    shippingRequest: '',
    shippingBank: '',
  });

  // 가격 상태 추가 및 표시
  const [price, setPrice] = useState<number>(0);

  // 체크박스 변화 콜백
  const handleStringTypesChange = (ids: string[]) => setFormData((prev) => ({ ...prev, stringTypes: ids }));

  const handleCustomInputChange = (val: string) => setFormData((prev) => ({ ...prev, customStringType: val }));

  useEffect(() => {
    if (!order) return;
    let total = 0;
    formData.stringTypes.forEach((id) => {
      if (id === 'custom') {
        // custom 선택 개수만큼 기본 수수료 곱하기 (보통 1개만 사용)
        total += 15000;
      } else {
        const item = order.items.find((it) => it.id === id);
        total += item?.mountingFee ?? 0;
      }
    });
    setPrice(total);
  }, [formData.stringTypes, order]);

  // 주문서 없는 단독 신청일 경우만 실행
  useEffect(() => {
    if (orderId) return;

    const checkUser = async () => {
      try {
        const res = await fetch('/api/users/me', { credentials: 'include' });
        const user = await res.json();

        if (user?.email) {
          setIsMember(true);
          setFormData((prev) => ({
            ...prev,
            name: user.name ?? '',
            email: user.email ?? '',
            phone: user.phone ?? '',
            shippingName: user.name ?? '',
            shippingEmail: user.email ?? '',
            shippingPhone: user.phone ?? '',
            shippingAddress: user.address ?? '',
            shippingAddressDetail: user.addressDetail ?? '',
            shippingPostcode: user.postalCode ?? '',
          }));
        }
      } catch {
        // 비회원인 경우 아무 처리하지 않음
        setIsMember(false);
      }
    };

    checkUser();
  }, [orderId]);

  // 주문 데이터 신청자 정보 불러오기
  useEffect(() => {
    if (!orderId) return;

    const fetchOrder = async () => {
      try {
        const orderRes = await fetch(`/api/orders/${orderId}`, { credentials: 'include' });
        const orderData = await orderRes.json();
        setOrder(orderData);

        // accessToken 꺼내기
        const userRes = await fetch('/api/users/me', { credentials: 'include' });
        const userData = await userRes.json();

        setFormData((prev) => ({
          ...prev,
          name: orderData.shippingInfo?.name ?? '',
          phone: orderData.shippingInfo?.phone ?? '',
          email: userData?.email ?? orderData?.guestInfo?.email ?? '',
          shippingName: orderData.shippingInfo?.name ?? '',
          shippingPhone: orderData.shippingInfo?.phone ?? '',
          shippingEmail: userData?.email ?? orderData?.guestInfo?.email ?? '',
          shippingAddress: orderData.shippingInfo?.address ?? '',
          shippingAddressDetail: orderData.shippingInfo?.addressDetail ?? '',
          shippingPostcode: orderData.shippingInfo?.postalCode ?? '',
          shippingDepositor: orderData.shippingInfo?.depositor ?? '',
          shippingBank: orderData.paymentInfo?.bank ?? '',
          shippingRequest: orderData.shippingInfo?.deliveryRequest ?? '',
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

  const handleOpenPostcode = () => {
    new window.daum.Postcode({
      oncomplete: function (data: any) {
        setFormData((prev) => ({
          ...prev,
          shippingAddress: data.roadAddress,
          shippingPostcode: data.zonecode,
        }));
      },
    }).open();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 공통 필수 필드만 먼저 검증
    if (!formData.name || !formData.phone || !formData.racketType || !formData.preferredDate) {
      showErrorToast('필수 항목을 모두 입력해주세요.');
      return;
    }

    // 스트링 종류 선택 여부 검증
    if (formData.stringTypes.length === 0) {
      showErrorToast('스트링 종류를 하나 이상 선택해주세요.');
      return;
    }

    // 직접입력 선택 시 입력 필드 값도 필수
    if (formData.stringTypes.includes('custom') && !formData.customStringType.trim()) {
      showErrorToast('스트링 종류를 직접 입력해주세요.');
      return;
    }

    // 입금자명 검증
    if (!formData.shippingDepositor?.trim()) {
      showErrorToast('입금자명을 입력해주세요.');
      return;
    }

    // 연락처 정제
    const cleaned = formData.phone.replace(/[^0-9]/g, '');
    if (!/^010\d{8}$/.test(cleaned)) {
      showErrorToast('연락처는 010으로 시작하는 숫자 11자리로 입력해주세요. 예: 01012345678');
      return;
    }

    setIsSubmitting(true);

    // const stringToSave = formData.stringType === 'custom' ? formData.customStringType.trim() : formData.stringType.trim();

    const payload = {
      name: formData.name,
      email: formData.email,
      phone: cleaned,
      racketType: formData.racketType,
      stringTypes: formData.stringTypes,
      customStringName: formData.stringTypes.includes('custom') ? formData.customStringType : null,
      preferredDate: formData.preferredDate,
      preferredTime: formData.preferredTime,
      requirements: formData.requirements,
      orderId,
      shippingInfo: {
        name: formData.shippingName,
        phone: formData.shippingPhone,
        email: formData.shippingEmail,
        address: formData.shippingAddress,
        addressDetail: formData.shippingAddressDetail,
        postalCode: formData.shippingPostcode,
        depositor: formData.shippingDepositor,
        bank: formData.shippingBank,
        deliveryRequest: formData.shippingRequest,
      },
    };

    try {
      const res = await fetch('/api/applications/stringing/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      });

      if (!res.ok) {
        const { message } = await res.json();
        throw new Error(message || '신청 실패');
      }

      const result = await res.json();

      showSuccessToast('신청이 완료되었습니다!');
      router.push(`/services/success?applicationId=${result.applicationId}`);
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
                    <div className="space-y-2">
                      <Label htmlFor="name">신청인 이름</Label>
                      <Input id="name" name="name" value={formData.name} onChange={handleInputChange} readOnly={!!(orderId || isMember)} className={orderId || isMember ? 'bg-muted text-muted-foreground cursor-not-allowed' : ''} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">이메일</Label>
                      <Input id="email" name="email" value={formData.email} onChange={handleInputChange} readOnly={!!(orderId || isMember)} className={orderId || isMember ? 'bg-muted text-muted-foreground cursor-not-allowed' : ''} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">연락처</Label>
                      <Input id="phone" name="phone" value={formData.phone} onChange={handleInputChange} readOnly={!!(orderId || isMember)} className={orderId || isMember ? 'bg-muted text-muted-foreground cursor-not-allowed' : ''} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="shippingAddress">주소</Label>
                      <div className="flex gap-2">
                        <Input
                          id="shippingAddress"
                          name="shippingAddress"
                          value={formData.shippingAddress}
                          onChange={handleInputChange}
                          readOnly={!!(orderId || isMember)}
                          className={orderId || isMember ? 'bg-muted text-muted-foreground cursor-not-allowed' : ''}
                        />
                        {!orderId && !isMember && (
                          <Button type="button" variant="outline" onClick={handleOpenPostcode}>
                            주소 검색
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="shippingAddressDetail">상세 주소</Label>
                      <Input
                        id="shippingAddressDetail"
                        name="shippingAddressDetail"
                        value={formData.shippingAddressDetail}
                        onChange={handleInputChange}
                        readOnly={!!(orderId || isMember)}
                        className={orderId || isMember ? 'bg-muted text-muted-foreground cursor-not-allowed' : ''}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="shippingPostcode">우편번호</Label>
                      <Input
                        id="shippingPostcode"
                        name="shippingPostcode"
                        value={formData.shippingPostcode}
                        onChange={handleInputChange}
                        readOnly={!!(orderId || isMember)}
                        className={orderId || isMember ? 'bg-muted text-muted-foreground cursor-not-allowed' : ''}
                      />
                    </div>
                    {/* <div className="space-y-2">
                      <Label htmlFor="shippingDepositor">입금자명</Label>
                      <Input id="shippingDepositor" name="shippingDepositor" value={formData.shippingDepositor} onChange={handleInputChange} />
                    </div> */}
                    {/* <div className="space-y-2">
                      <Label htmlFor="shippingRequest">요청사항</Label>
                      <Textarea id="shippingRequest" name="shippingRequest" value={formData.shippingRequest} onChange={handleInputChange} />
                    </div> */}
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
                      <StringCheckboxes
                        items={(order?.items ?? [])
                          // mountingFee가 undefined인 경우 제거
                          .filter((i) => i.mountingFee !== undefined)
                          // id, name, mountingFee를 확실히 number로 매핑
                          .map((i) => ({
                            id: i.id,
                            name: i.name,
                            mountingFee: i.mountingFee!, // or i.mountingFee ?? 0
                          }))}
                        stringTypes={formData.stringTypes}
                        customInput={formData.customStringType}
                        onChange={handleStringTypesChange}
                        onCustomInputChange={handleCustomInputChange}
                      />
                      {/* 가격 표시 영역 */}
                      <div className="text-sm text-muted-foreground mt-2">
                        {formData.stringTypes.includes('custom') ? (
                          <>
                            <div>💡 가격은 접수 후 안내됩니다.</div>
                            <div className="text-xs text-muted-foreground">기본 장착 금액: 15,000원</div>
                          </>
                        ) : (
                          <div>💰 금액: {price.toLocaleString()}원</div>
                        )}
                      </div>
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

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">🏦 결제 정보</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="shippingBank">은행</Label>
                      <select id="shippingBank" name="shippingBank" value={formData.shippingBank} onChange={(e) => setFormData({ ...formData, shippingBank: e.target.value })} className="w-full border px-3 py-2 rounded-md bg-white">
                        <option value="" disabled hidden>
                          입금하실 은행을 선택해주세요.
                        </option>
                        {Object.entries(bankLabelMap).map(([key, info]) => (
                          <option key={key} value={key}>
                            {info.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {formData.shippingBank && (
                      <div className="p-3 rounded-md border bg-muted text-sm space-y-1">
                        <p>
                          💳 <strong>계좌번호:</strong> {bankLabelMap[formData.shippingBank].account}
                        </p>
                        <p>
                          👤 <strong>예금주:</strong> {bankLabelMap[formData.shippingBank].holder}
                        </p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="shippingDepositor">입금자명</Label>
                      <Input id="shippingDepositor" name="shippingDepositor" value={formData.shippingDepositor} onChange={handleInputChange} placeholder="입금자명을 입력하세요" />
                    </div>
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
