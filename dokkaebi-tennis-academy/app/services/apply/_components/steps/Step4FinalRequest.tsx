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
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <CheckCircle className="h-8 w-8 text-foreground" />
        </div>
        <h2 className="text-2xl font-bold mb-2">추가 요청</h2>
        <p className="text-muted-foreground">추가 요청사항을 입력해주세요</p>
      </div>

      {/* 안내 배너: 주문/회원 기반일 때 */}
      {(orderId || isMember) && (
        <div className="bg-muted/40 dark:bg-muted/30 border border-border rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Shield className="h-5 w-5 text-warning mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-warning mb-1">📢 안내사항</p>
              <p className="text-warning leading-relaxed">
                신청자/배송 정보는 <span className="font-semibold">주문 당시 정보</span>를 기준으로 작성됩니다. 회원정보를 수정하셨더라도 <span className="font-semibold">신청서 정보는 자동으로 바뀌지 않습니다.</span>
                <br />
                변경이 필요하면 아래 <span className="font-semibold">추가 요청사항</span>에 꼭 남겨주세요.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 패키지 관련 최종 안내 */}
      <div className="rounded-2xl border border-border bg-card/70 dark:bg-card p-5">
        <div className="flex items-center gap-2">
          <Badge
            className={
              packageInsufficient
                ? 'bg-accent text-destructive dark:bg-destructive dark:text-destructive border border-border/80'
                : usingPackage
                  ? 'bg-accent text-primary dark:bg-primary dark:text-muted-foreground border border-border/80'
                  : 'bg-background text-foreground dark:bg-card dark:text-muted-foreground border border-border'
            }
          >
            {packageInsufficient ? '패키지 적용 불가' : usingPackage ? '패키지 적용' : '일반 결제'}
          </Badge>
          <p className="text-sm text-foreground">
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
