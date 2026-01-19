'use client';

import type React from 'react';
import { CheckCircle, Shield } from 'lucide-react';

import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

type Props = {
  formData: any;
  setFormData: any;
  handleInputChange: any;

  orderId: string | null;
  isMember: boolean;

  usingPackage: boolean;
  packageInsufficient: boolean;
};

export default function Step4FinalRequest({ formData, setFormData, handleInputChange, orderId, isMember, usingPackage, packageInsufficient }: Props) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 mb-4">
          <CheckCircle className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold mb-2">추가 요청</h2>
        <p className="text-muted-foreground">추가 요청사항을 입력해주세요</p>
      </div>

      {/* 안내 배너: 주문/회원 기반일 때 */}
      {(orderId || isMember) && (
        <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Shield className="h-5 w-5 text-orange-500 dark:text-orange-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-orange-800 dark:text-orange-300 mb-1">📢 안내사항</p>
              <p className="text-orange-700 dark:text-orange-200 leading-relaxed">
                신청자/배송 정보는 <span className="font-semibold">주문 당시 정보</span>를 기준으로 작성됩니다. 회원정보를 수정하셨더라도 <span className="font-semibold">신청서 정보는 자동으로 바뀌지 않습니다.</span>
                <br />
                변경이 필요하면 아래 <span className="font-semibold">추가 요청사항</span>에 꼭 남겨주세요.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 패키지 관련 최종 안내 */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/30 p-5">
        <div className="flex items-center gap-2">
          <Badge
            className={
              packageInsufficient
                ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-100 border border-red-200/80'
                : usingPackage
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-100 border border-emerald-200/80'
                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-100 border border-slate-200/80'
            }
          >
            {packageInsufficient ? '패키지 적용 불가' : usingPackage ? '패키지 적용' : '일반 결제'}
          </Badge>
          <p className="text-sm text-slate-700 dark:text-slate-200">
            {packageInsufficient ? '이번 신청은 패키지 잔여 부족으로 일반 결제로 진행됩니다.' : usingPackage ? '이번 신청은 패키지로 처리되어 교체비가 0원으로 계산됩니다.' : '이번 신청은 일반 결제(무통장 입금)로 진행됩니다.'}
          </p>
        </div>
      </div>

      {/* 추가 요청사항 */}
      <div className="space-y-2">
        <Label htmlFor="requirements" className="text-sm font-medium">
          추가 요청사항 (선택)
        </Label>
        <Textarea id="requirements" name="requirements" value={formData.requirements ?? ''} onChange={handleInputChange} placeholder="예) 특정 텐션 유지, 프레임 상태 체크 요청 등" className="min-h-[140px]" />
        <p className="text-xs text-muted-foreground">요청사항이 많거나 중요한 정보(주소 변경, 연락처 변경 등)가 있다면 이곳에 남겨주세요.</p>
      </div>
    </div>
  );
}
