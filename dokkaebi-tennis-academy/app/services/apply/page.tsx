'use client';

import type React from 'react';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { useSearchParams } from 'next/navigation';
import type { Order } from '@/lib/types/order';
import TimeSlotSelector from '@/app/services/_components/TimeSlotSelector';
import { bankLabelMap } from '@/lib/constants';
import StringCheckboxes from '@/app/services/_components/StringCheckboxes';
import { User, RatIcon as Racquet, CreditCard, MapPin, Clock, CheckCircle, ArrowRight, Shield, Award, Zap, DollarSign, SlidersHorizontal, Settings2, Wrench, PanelTopClose, FormInput, ClipboardList } from 'lucide-react';

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
  const [isMember, setIsMember] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
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
      oncomplete: (data: any) => {
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

    // 마지막 단계(5단계)가 아니면 제출하지 않음
    if (currentStep !== steps.length) {
      return;
    }

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

  const steps = [
    { id: 1, title: '신청자 정보', icon: User, description: '기본 정보를 입력해주세요' },
    { id: 2, title: '장착 정보', icon: ClipboardList, description: '라켓과 스트링 정보를 선택해주세요' },
    { id: 3, title: '결제 정보', icon: CreditCard, description: '결제 방법을 선택해주세요' },
    { id: 4, title: '추가 요청', icon: CheckCircle, description: '추가 요청사항을 입력해주세요' },
  ];

  const getCurrentStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 mb-4">
                <User className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-2">신청자 정보</h2>
              <p className="text-muted-foreground">정확한 정보를 입력해주세요</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  신청인 이름 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  readOnly={!!(orderId || isMember)}
                  className={`transition-all duration-200 ${orderId || isMember ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'focus:ring-2 focus:ring-blue-500'}`}
                  placeholder="이름을 입력해주세요"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  이메일 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  readOnly={!!(orderId || isMember)}
                  className={`transition-all duration-200 ${orderId || isMember ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'focus:ring-2 focus:ring-blue-500'}`}
                  placeholder="이메일을 입력해주세요"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium">
                  연락처 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  readOnly={!!(orderId || isMember)}
                  className={`transition-all duration-200 ${orderId || isMember ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'focus:ring-2 focus:ring-blue-500'}`}
                  placeholder="01012345678"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shippingPostcode" className="text-sm font-medium">
                  우편번호 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="shippingPostcode"
                  name="shippingPostcode"
                  value={formData.shippingPostcode}
                  onChange={handleInputChange}
                  readOnly={!!(orderId || isMember)}
                  className={`transition-all duration-200 ${orderId || isMember ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'focus:ring-2 focus:ring-blue-500'}`}
                  placeholder="우편번호"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="shippingAddress" className="text-sm font-medium">
                  주소 <span className="text-red-500">*</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="shippingAddress"
                    name="shippingAddress"
                    value={formData.shippingAddress}
                    onChange={handleInputChange}
                    readOnly={!!(orderId || isMember)}
                    className={`flex-1 transition-all duration-200 ${orderId || isMember ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'focus:ring-2 focus:ring-blue-500'}`}
                    placeholder="주소를 입력해주세요"
                  />
                  {!orderId && !isMember && (
                    <Button type="button" variant="outline" onClick={handleOpenPostcode} className="whitespace-nowrap hover:bg-blue-50 hover:border-blue-300 transition-colors duration-200 bg-transparent">
                      <MapPin className="h-4 w-4 mr-2" />
                      주소 검색
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="shippingAddressDetail" className="text-sm font-medium">
                  상세 주소
                </Label>
                <Input
                  id="shippingAddressDetail"
                  name="shippingAddressDetail"
                  value={formData.shippingAddressDetail}
                  onChange={handleInputChange}
                  readOnly={!!(orderId || isMember)}
                  className={`transition-all duration-200 ${orderId || isMember ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'focus:ring-2 focus:ring-blue-500'}`}
                  placeholder="상세 주소를 입력해주세요"
                />
              </div>
            </div>

            {(orderId || isMember) && (
              <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Shield className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-orange-800 mb-1">📢 안내사항</p>
                    <p className="text-orange-700 leading-relaxed">
                      신청자 정보는 <span className="font-semibold">주문 당시 정보</span>를 기준으로 작성됩니다. 회원정보를 수정하셨더라도 <span className="font-semibold">신청자 정보는 변경되지 않습니다.</span>
                      <br />
                      변경이 필요한 경우, <span className="text-orange-600 font-semibold">추가 요청사항</span>에 기재해주세요.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-green-500 to-blue-600 mb-4">
                <ClipboardList className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-2">장착 정보</h2>
              <p className="text-muted-foreground">라켓과 스트링 정보를 선택해주세요</p>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="racketType" className="text-sm font-medium">
                  라켓 종류 <span className="text-red-500">*</span>
                </Label>
                <Input id="racketType" name="racketType" value={formData.racketType} onChange={handleInputChange} placeholder="예: 윌슨 프로 스태프 97" className="focus:ring-2 focus:ring-green-500 transition-all duration-200" />
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">
                    스트링 종류 <span className="text-red-500">*</span>
                  </Label>
                  <div className="mt-2 space-y-2">
                    <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <Zap className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-red-700">
                          <p className="font-medium mb-1">⚠️ 중요 안내</p>
                          <p>• 스트링을 구매하시고 난 후 신청서를 작성하셔야 구매한 스트링 종류가 나옵니다.</p>
                          <p>• 고객님께서 보유하고 계신 스트링으로 단일 신청서를 작성하시려는 경우 "직접 입력하기" 를 클릭하여 신청해주세요.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <StringCheckboxes
                  items={(order?.items ?? [])
                    .filter((i) => i.mountingFee !== undefined)
                    .map((i) => ({
                      id: i.id,
                      name: i.name,
                      mountingFee: i.mountingFee!,
                    }))}
                  stringTypes={formData.stringTypes}
                  customInput={formData.customStringType}
                  onChange={handleStringTypesChange}
                  onCustomInputChange={handleCustomInputChange}
                />

                <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <DollarSign className="h-5 w-5 text-blue-500 flex-shrink-0" />
                    <div className="text-sm">
                      {formData.stringTypes.includes('custom') ? (
                        <div className="text-blue-700">
                          <p className="font-medium">💡 가격은 접수 후 안내됩니다.</p>
                          <p className="text-xs text-blue-600 mt-1">기본 장착 금액: 15,000원</p>
                        </div>
                      ) : (
                        <p className="font-medium text-blue-700">총 장착 금액: {price.toLocaleString()}원</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="preferredDate" className="text-sm font-medium">
                    장착 희망일 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="preferredDate"
                    name="preferredDate"
                    type="date"
                    value={formData.preferredDate}
                    onChange={handleInputChange}
                    min={new Date().toISOString().split('T')[0]}
                    className="focus:ring-2 focus:ring-green-500 transition-all duration-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">희망 시간대</Label>
                  <TimeSlotSelector selected={formData.preferredTime} selectedDate={formData.preferredDate} onSelect={(value) => setFormData((prev) => ({ ...prev, preferredTime: value }))} />
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-600 mb-4">
                <CreditCard className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-2">결제 정보</h2>
              <p className="text-muted-foreground">결제 방법을 선택해주세요</p>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="shippingBank" className="text-sm font-medium">
                  은행 선택 <span className="text-red-500">*</span>
                </Label>
                <select
                  id="shippingBank"
                  name="shippingBank"
                  value={formData.shippingBank}
                  onChange={(e) => setFormData({ ...formData, shippingBank: e.target.value })}
                  className="w-full border border-gray-300 px-3 py-2 rounded-md bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                >
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
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="font-semibold text-blue-900 mb-4 flex items-center">
                    <CreditCard className="h-5 w-5 mr-2" />
                    계좌 정보
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                      <span className="text-sm text-gray-600">은행</span>
                      <span className="font-medium text-gray-900">{bankLabelMap[formData.shippingBank].label}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                      <span className="text-sm text-gray-600">계좌번호</span>
                      <span className="font-mono font-medium text-gray-900">{bankLabelMap[formData.shippingBank].account}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                      <span className="text-sm text-gray-600">예금주</span>
                      <span className="font-medium text-gray-900">{bankLabelMap[formData.shippingBank].holder}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="shippingDepositor" className="text-sm font-medium">
                  입금자명 <span className="text-red-500">*</span>
                </Label>
                <Input id="shippingDepositor" name="shippingDepositor" value={formData.shippingDepositor} onChange={handleInputChange} placeholder="입금자명을 입력하세요" className="focus:ring-2 focus:ring-purple-500 transition-all duration-200" />
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-green-500 to-teal-600 mb-4">
                <CheckCircle className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-2">추가 요청사항</h2>
              <p className="text-muted-foreground">특별한 요청사항이 있으시면 입력해주세요</p>
            </div>

            <div className="space-y-4">
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-amber-700">
                    <p className="font-medium mb-1">안내사항</p>
                    <p>스트링 교체 및 장착 요청 내용을 아래에 자세히 적어주세요.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="requirements" className="text-sm font-medium">
                  요청사항
                </Label>
                <Textarea
                  id="requirements"
                  name="requirements"
                  value={formData.requirements}
                  onChange={handleInputChange}
                  placeholder="예: 첫 번째 라켓에는 RPM Blast, 두 번째 라켓에는 Xcel 장착 요청"
                  rows={6}
                  className="resize-none focus:ring-2 focus:ring-green-500 transition-all duration-200"
                />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-teal-600 py-16">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative container mx-auto px-4 text-center text-white">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm mb-6">
            <Wrench className="h-10 w-10" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">스트링 장착 서비스 신청</h1>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto">전문가가 직접 라켓에 스트링을 장착해드립니다</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Progress Steps */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-8">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 ${
                        currentStep >= step.id ? 'bg-gradient-to-r from-blue-500 to-purple-600 border-transparent text-white' : 'border-gray-300 text-gray-400 bg-white'
                      }`}
                    >
                      <step.icon className="h-6 w-6" />
                    </div>
                    <div className="mt-2 text-center">
                      <p className={`text-sm font-medium ${currentStep >= step.id ? 'text-blue-600' : 'text-gray-400'}`}>{step.title}</p>
                      <p className="text-xs text-gray-500 mt-1 hidden sm:block">{step.description}</p>
                    </div>
                  </div>
                  {index < steps.length - 1 && <div className={`flex-1 h-0.5 mx-4 transition-all duration-300 ${currentStep > step.id ? 'bg-gradient-to-r from-blue-500 to-purple-600' : 'bg-gray-300'}`} />}
                </div>
              ))}
            </div>
          </div>

          <Card className="backdrop-blur-sm bg-white/80 dark:bg-slate-800/80 border-0 shadow-2xl">
            <CardContent className="p-8">
              <form onSubmit={handleSubmit}>
                {getCurrentStepContent()}

                <div className="flex justify-between mt-12 pt-8 border-t">
                  <Button type="button" variant="outline" onClick={() => setCurrentStep(Math.max(1, currentStep - 1))} disabled={currentStep === 1} className="px-8 py-3 hover:bg-gray-50 transition-colors duration-200">
                    이전
                  </Button>

                  {currentStep < 4 ? (
                    <Button type="button" onClick={() => setCurrentStep(Math.min(4, currentStep + 1))} className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white transition-all duration-200">
                      다음
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      disabled={isSubmitting}
                      onClick={(e) => handleSubmit(e as unknown as React.FormEvent)}
                      className="px-8 py-3 bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white transition-all duration-200 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          신청서 제출 중...
                        </>
                      ) : (
                        <>
                          신청서 제출하기
                          <CheckCircle className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-xl border border-white/20">
              <Shield className="h-8 w-8 text-blue-500 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">정품 보장</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">100% 정품 스트링만 사용합니다</p>
            </div>
            <div className="text-center p-6 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-xl border border-white/20">
              <Clock className="h-8 w-8 text-green-500 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">당일 완료</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">빠르고 정확한 장착 서비스</p>
            </div>
            <div className="text-center p-6 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-xl border border-white/20">
              <Award className="h-8 w-8 text-purple-500 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">전문가 상담</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">15년 경력의 전문가가 직접</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
