'use client';

import type React from 'react';

import { useRouter } from 'next/navigation';
import { User, Truck, Store, Shield, MapPin, Box } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

import { normalizeCollection } from '@/app/features/stringing-applications/lib/collection';

type CollectionMethod = 'self_ship' | 'courier_pickup' | 'visit';

type Props = {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  handleInputChange: (e: any) => void;
  handleOpenPostcode: () => void;

  orderId: string | null;
  isMember: boolean;
  isVisitDelivery: boolean;
  lockCollection: boolean;

  applicationId: string | null;
  isUserLoading: boolean;
};

export default function Step1ApplicantInfo({ formData, setFormData, handleInputChange, handleOpenPostcode, orderId, isMember, isVisitDelivery, lockCollection, applicationId, isUserLoading }: Props) {
  const router = useRouter();

  // 방문 수령(주문 기반)일 땐 방문 접수 외 선택을 막는 용도
  // (원본 코드에 lockVisit 변수가 JSX에서 사용되고 있어, 여기서 안전하게 정의해 둡니다.)
  const lockVisit = lockCollection || isVisitDelivery;

  return (
    <div className="relative space-y-6">
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
        {/* === 수거 방식 선택 (카드 버튼형) === */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">
            수거 방식 <span className="text-red-500">*</span>
          </Label>

          {normalizeCollection(formData.collectionMethod) === 'self_ship' && applicationId && (
            <div
              className="
                block cursor-pointer rounded-xl
                border border-slate-200/80 dark:border-slate-700/60
                bg-white/90 dark:bg-slate-800/80
                px-4 py-3 shadow-sm
                hover:bg-slate-50 dark:hover:bg-slate-700/80
                transition text-sm
                peer-data-[state=checked]:border-blue-500 peer-data-[state=checked]:bg-blue-50 dark:peer-data-[state=checked]:bg-blue-900/30 peer-data-[state=checked]:ring-1 peer-data-[state=checked]:ring-blue-200 dark:peer-data-[state=checked]:ring-blue-800
              "
            >
              <div className="font-semibold mb-1 text-slate-900 dark:text-slate-100">자가 발송 안내</div>
              <p className="mb-3 text-slate-700 dark:text-slate-300">편의점/우체국 등으로 직접 발송하실 수 있어요. 운송장/포장 가이드는 아래 버튼에서 확인하세요.</p>
              <button
                type="button"
                onClick={async () => {
                  try {
                    // 초안의 수거방식을 자가발송으로 저장
                    await fetch(`/api/applications/stringing/${applicationId}/shipping`, {
                      method: 'PATCH',
                      credentials: 'include',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        shippingInfo: { collectionMethod: 'self_ship' },
                      }),
                    });
                  } catch {}
                  // 그리고 안내 페이지로 이동
                  router.push(`/services/applications/${applicationId}/shipping`);
                }}
                className="inline-flex items-center rounded-md bg-amber-500 px-3 py-2 text-white hover:bg-amber-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-300 dark:focus:ring-amber-600"
              >
                운송장/자가발송 안내 보기
              </button>
            </div>
          )}
          <RadioGroup
            value={formData.collectionMethod}
            onValueChange={(v) =>
              setFormData((prev: any) => {
                // 주문 연동 모드에서는 수거 방식 변경 자체를 막는다.
                if (lockCollection) return prev;
                const next = { ...prev, collectionMethod: v as CollectionMethod };
                // 방문 접수 시, 날짜/시간 필드는 초기화 (기존에 선택된게 있다면)
                if (normalizeCollection(v) === 'visit') {
                  (next as any).preferredDate = '';
                  (next as any).preferredTime = '';
                }
                return next;
              })
            }
            className="grid gap-3 md:grid-cols-3"
          >
            {/* 자가 발송 */}
            <div>
              <RadioGroupItem id="cm-self" value="self_ship" disabled={lockCollection || isVisitDelivery} className="peer sr-only" />
              <Label
                htmlFor="cm-self"
                className="block cursor-pointer rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition
             peer-data-[state=checked]:border-blue-500 peer-data-[state=checked]:bg-blue-50 dark:peer-data-[state=checked]:bg-blue-900/30 peer-data-[state=checked]:ring-1 peer-data-[state=checked]:ring-blue-200 dark:peer-data-[state=checked]:ring-blue-800"
              >
                <div className="flex items-center gap-2">
                  <Box className="h-4 w-4" />
                  <span className="font-medium">자가 발송</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">편의점/우체국 등</p>
              </Label>
            </div>

            {/* 기사 방문 수거 비노출 
            <div>
              <RadioGroupItem id="cm-pickup" value="courier_pickup" disabled={lockVisit} className="peer sr-only" />
              <Label
                htmlFor="cm-pickup"
                className="block cursor-pointer rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition
             peer-data-[state=checked]:border-blue-500 peer-data-[state=checked]:bg-blue-50 dark:peer-data-[state=checked]:bg-blue-900/30 peer-data-[state=checked]:ring-1 peer-data-[state=checked]:ring-blue-200 dark:peer-data-[state=checked]:ring-blue-800"
              >
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  <span className="font-medium">택배 기사 방문 수거</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">선택 시 +3,000원 (후정산)</p>
              </Label>
            </div> */}

            {/* 매장 방문 접수 */}
            <div>
              <RadioGroupItem id="cm-visit" value="visit" disabled={lockCollection /* 방문 모드도 주문 기반이면 변경 금지 */} className="peer sr-only" />
              <Label
                htmlFor="cm-visit"
                className="block cursor-pointer rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition
             peer-data-[state=checked]:border-blue-500 peer-data-[state=checked]:bg-blue-50 dark:peer-data-[state=checked]:bg-blue-900/30 peer-data-[state=checked]:ring-1 peer-data-[state=checked]:ring-blue-200 dark:peer-data-[state=checked]:ring-blue-800"
              >
                <div className="flex items-center gap-2">
                  <Store className="h-4 w-4" />
                  <span className="font-medium">매장 방문 접수</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">방문 가능 시간대만 선택</p>
              </Label>
            </div>
          </RadioGroup>
          {lockCollection && <p className="mt-2 text-xs text-slate-500">라켓 구매 단계에서 선택한 접수 방식은 변경할 수 없습니다.</p>}

          {/* 기사 방문 수거 선택 시 추가 입력 */}
          {normalizeCollection(formData.collectionMethod) === 'courier_pickup' && (
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor="pickupDate" className="text-sm font-medium">
                  수거 희망일
                </Label>
                <Input id="pickupDate" name="pickupDate" type="date" value={formData.pickupDate} onChange={handleInputChange} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="pickupTime" className="text-sm font-medium">
                  수거 시간대
                </Label>
                <Input id="pickupTime" name="pickupTime" placeholder="예: 10:00~13:00" value={formData.pickupTime} onChange={handleInputChange} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="pickupNote" className="text-sm font-medium">
                  기사 메모(선택)
                </Label>
                <Input id="pickupNote" name="pickupNote" placeholder="공동현관 비번/경비실 맡김 등" value={formData.pickupNote} onChange={handleInputChange} />
              </div>
            </div>
          )}

          {normalizeCollection(formData.collectionMethod) === 'courier_pickup' && <p className="text-xs text-muted-foreground">※ 기사 방문 수거 선택 시 수거비 +3,000원이 발생합니다(후정산 / 결제 합산은 관리자 확정 시 반영).</p>}
        </div>
      </div>
      {/* 로딩 오버레이 */}
      {isUserLoading && (
        <div className="absolute inset-0 z-10 rounded-2xl bg-white/45 dark:bg-slate-900/40 backdrop-blur-[2px] ring-1 ring-inset ring-slate-200/60 dark:ring-slate-700/60 grid place-content-center">
          <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-400 dark:border-slate-500 border-t-transparent" />
            <span className="text-sm">회원 정보 불러오는 중…</span>
          </div>
        </div>
      )}
      {(orderId || isMember) && (
        <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Shield className="h-5 w-5 text-orange-500 dark:text-orange-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-orange-800 dark:text-orange-300 mb-1">📢 안내사항</p>
              <p className="text-orange-700 dark:text-orange-200 leading-relaxed">
                신청자 정보는 <span className="font-semibold">주문 당시 정보</span>를 기준으로 작성됩니다. 회원정보를 수정하셨더라도 <span className="font-semibold">신청자 정보는 변경되지 않습니다.</span>
                <br />
                변경이 필요한 경우, <span className="text-orange-600 dark:text-orange-400 font-semibold">추가 요청사항</span>에 기재해주세요.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
