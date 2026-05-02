"use client";

import type React from "react";
import { CheckCircle, Shield } from "lucide-react";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

export type FinalRequestSectionProps = {
  formData: any;
  setFormData: any;
  handleInputChange: any;

  orderId: string | null;
  isMember: boolean;

  usingPackage: boolean;
  packageInsufficient: boolean;
  context?: "apply" | "checkout";
};

export default function FinalRequestSection({
  formData,
  setFormData,
  handleInputChange,
  orderId,
  isMember,
  usingPackage,
  packageInsufficient,
  context = "apply",
}: FinalRequestSectionProps) {
  const showApplyLockedNotice = context === "apply" && (orderId || isMember);

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-secondary mb-4">
          <CheckCircle className="h-8 w-8 text-foreground" />
        </div>
        <h2 className="text-2xl font-bold mb-2">요청사항</h2>
        <p className="text-muted-foreground">장착 관련 요청사항을 남겨주세요</p>
      </div>

      {/* 안내 배너: 주문/회원 기반일 때 */}
      {showApplyLockedNotice && (
        <div className="bg-muted/40 dark:bg-muted/30 border border-border rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Shield className="h-5 w-5 text-warning mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="mb-1 font-medium text-warning">📢 안내사항</p>
              <p className="leading-relaxed text-foreground">
                신청자/배송 정보는{" "}
                <span className="font-semibold">주문 당시 정보</span>를 기준으로
                작성됩니다. 회원정보를 수정하셨더라도{" "}
                <span className="font-semibold">
                  신청서 정보는 자동으로 바뀌지 않습니다.
                </span>
                <br />
                변경이 필요하면 아래{" "}
                <span className="font-semibold text-warning">
                  추가 요청사항
                </span>
                에 꼭 남겨주세요.
              </p>
            </div>
          </div>
        </div>
      )}

      {context === "checkout" && (
        <div className="bg-muted/40 dark:bg-muted/30 border border-border rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Shield className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="mb-1 font-medium text-foreground">📢 안내사항</p>
              <p className="leading-relaxed text-foreground">
                배송/연락처 정보는 상단에서 입력한{" "}
                <span className="font-semibold">현재 checkout 정보</span>{" "}
                기준으로 함께 접수됩니다.
                <br />
                장착 관련 추가 요청사항이 있으면 아래{" "}
                <span className="font-semibold text-primary">
                  추가 요청사항
                </span>
                에 남겨주세요.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 패키지 관련 최종 안내 */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <Badge
            className={
              packageInsufficient
                ? "border border-destructive/30 bg-destructive/10 text-destructive dark:bg-destructive/15"
                : usingPackage
                  ? "border border-border bg-secondary text-foreground"
                  : "border border-border bg-muted text-foreground dark:bg-card"
            }
          >
            {packageInsufficient
              ? "패키지 적용 불가"
              : usingPackage
                ? "패키지 적용"
                : "일반 결제"}
          </Badge>
          <p className="text-sm text-foreground">
            {packageInsufficient
              ? "이번 신청은 패키지 잔여 부족으로 일반 결제로 진행됩니다."
              : usingPackage
                ? "이번 신청은 패키지로 처리되어 교체비가 0원으로 계산됩니다."
                : "이번 신청은 일반 결제(무통장 입금)로 진행됩니다."}
          </p>
        </div>
      </div>

      {/* 추가 요청사항 */}
      <div className="space-y-2">
        <Label htmlFor="requirements" className="text-sm font-medium">
          추가 요청사항 (선택)
        </Label>
        <Textarea
          id="requirements"
          name="requirements"
          value={formData.requirements ?? ""}
          onChange={handleInputChange}
          placeholder="예) 특정 텐션 유지, 프레임 상태 체크 요청 등"
          className="min-h-[140px]"
        />
        <p className="text-xs text-muted-foreground">
          {context === "checkout"
            ? "장착 관련 요청이나 전달이 필요한 메모가 있다면 이곳에 남겨주세요."
            : "요청사항이 많거나 중요한 정보(주소 변경, 연락처 변경 등)가 있다면 이곳에 남겨주세요."}
        </p>
      </div>
    </div>
  );
}
