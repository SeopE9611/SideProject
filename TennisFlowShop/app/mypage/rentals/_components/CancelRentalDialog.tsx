"use client";

import RefundAccountFields from "@/components/refund/RefundAccountFields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  readCancelRequestError,
  validateRefundAccountInput,
} from "@/lib/cancel-request/refund-account-client";
import {
  UNSAVED_CHANGES_MESSAGE,
  useUnsavedChangesGuard,
} from "@/lib/hooks/useUnsavedChangesGuard";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { XCircle } from "lucide-react";
import { useState } from "react";
import { mutate } from "swr";

interface CancelRentalDialogProps {
  rentalId: string;
  onSuccess?: () => void | Promise<void>;
  // 버튼을 노출하되 클릭만 막고 싶을 때 사용
  disabled?: boolean;
}

const CancelRentalDialog = ({
  rentalId,
  onSuccess,
  disabled = false,
}: CancelRentalDialogProps) => {
  // 모달 열림/닫힘 상태
  const [open, setOpen] = useState(false);
  // 선택된 기본 사유
  const [selectedReason, setSelectedReason] = useState<string | undefined>();
  // "기타" 선택 시 추가 입력 사유
  const [otherReason, setOtherReason] = useState("");
  // API 호출 중 여부
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 환불 계좌
  const [refundBank, setRefundBank] = useState<string>("");
  const [refundAccount, setRefundAccount] = useState("");
  const [refundHolder, setRefundHolder] = useState("");

  /**
   * 다이얼로그 내부 입력값 초기화
   * - 닫기
   * - 성공 후 종료
   * 두 경우 모두 동일한 정리가 필요하므로 함수로 분리
   */
  const resetForm = () => {
    setSelectedReason(undefined);
    setOtherReason("");
    setRefundBank("");
    setRefundAccount("");
    setRefundHolder("");
  };

  // 입력/선택이 있는 상태에서 페이지 이탈(뒤로가기/링크/탭닫기) 방지
  const isDirty =
    open &&
    (selectedReason !== undefined ||
      otherReason.trim().length > 0 ||
      refundBank !== "" ||
      refundAccount.trim().length > 0 ||
      refundHolder.trim().length > 0);
  useUnsavedChangesGuard(isDirty);

  // “닫기” 시 입력 유실 방지 (ESC/오버레이/닫기 버튼 모두 여기로 들어옴)
  const handleOpenChange = (next: boolean) => {
    // 제출 중/비활성 상태에서는 상태 변경 차단(기존 규칙 유지)
    if (isSubmitting || disabled) return;

    // 열기
    if (next) {
      setOpen(true);
      return;
    }

    // 닫기: dirty면 confirm
    if (isDirty) {
      const ok = window.confirm(UNSAVED_CHANGES_MESSAGE);
      if (!ok) return; // 닫기 취소
    }

    // 닫힐 때는 “버리기”가 확정이므로 상태를 정리
    setOpen(false);
    resetForm();
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    if (!selectedReason) {
      showErrorToast("취소 사유를 선택해주세요.");
      return;
    }
    if (selectedReason === "기타" && !otherReason.trim()) {
      showErrorToast("기타 사유를 입력해주세요.");
      return;
    }

    const refundValidation = validateRefundAccountInput({
      bank: refundBank,
      account: refundAccount,
      holder: refundHolder,
    });
    if (!refundValidation.ok) {
      showErrorToast(refundValidation.message);
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        // DB에는 사용자가 선택한 옵션 그대로 저장 (단순 변심 / 배송 지연 / 기타 …)
        reasonCode: selectedReason,
        // "기타"일 때만 입력한 텍스트 저장, 나머지는 공란
        reasonText: selectedReason === "기타" ? otherReason.trim() : "",
        refundAccount: {
          bank: refundValidation.value.bank,
          account: refundValidation.value.account,
          holder: refundValidation.value.holder,
        },
      };

      const res = await fetch(`/api/rentals/${rentalId}/cancel-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const parsed = await readCancelRequestError(
          res,
          "대여 취소 요청 처리 중 오류가 발생했습니다.",
        );
        throw new Error(
          parsed.message || "대여 취소 요청 처리 중 오류가 발생했습니다.",
        );
      }

      showSuccessToast(
        "대여 취소 요청이 접수되었습니다. 관리자 확인 후 처리됩니다.",
      );

      // 상세 데이터 갱신 (혹시 다른 곳에서 SWR로 쓰고 있을 수도 있으니 유지)
      await mutate(`/api/rentals/${rentalId}`, undefined, { revalidate: true });
      // 마이페이지 상세에 맞춰주려면 이 줄도 추가해 두면 좋음
      await mutate(`/api/me/rentals/${rentalId}`, undefined, {
        revalidate: true,
      });

      // 마이페이지 목록 갱신
      await mutate(
        (key: string) => key?.startsWith("/api/me/rentals"),
        undefined,
        { revalidate: true },
      );

      // 성공 종료 시에도 입력값은 초기화(다음 오픈 시 이전 선택값 잔존 방지)
      resetForm();
      // 모달 닫기
      setOpen(false);
      if (onSuccess) {
        await onSuccess();
      }
    } catch (e) {
      console.error(e);
      showErrorToast(
        e instanceof Error
          ? e.message
          : "대여 취소 요청 중 오류가 발생했습니다.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="destructive"
          size="sm"
          disabled={isSubmitting || disabled}
          className={`gap-2 ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
        >
          <XCircle className="mr-2 h-4 w-4" />
          대여 취소 요청
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>대여 취소 요청</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>취소 사유</Label>
            <Select value={selectedReason} onValueChange={setSelectedReason}>
              <SelectTrigger>
                <SelectValue placeholder="취소 사유를 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="단순 변심">단순 변심</SelectItem>
                <SelectItem value="일정 변경">일정 변경</SelectItem>
                <SelectItem value="예약 실수">예약 실수</SelectItem>
                <SelectItem value="기타">기타</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedReason === "기타" && (
            <div className="space-y-2">
              <Label>기타 사유</Label>
              <Textarea
                rows={3}
                value={otherReason}
                onChange={(e) => setOtherReason(e.target.value)}
                placeholder="취소 요청 사유를 입력해주세요."
              />
            </div>
          )}
          <RefundAccountFields
            bank={refundBank}
            account={refundAccount}
            holder={refundHolder}
            onBankChange={setRefundBank}
            onAccountChange={setRefundAccount}
            onHolderChange={setRefundHolder}
            description="기존 계좌와 다르면, 실제 환불받을 계좌로 다시 입력해주세요."
            disabled={isSubmitting}
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            type="button"
            disabled={isSubmitting}
            onClick={() => handleOpenChange(false)}
          >
            닫기
          </Button>
          <Button
            variant="destructive"
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? "처리 중..." : "취소 요청하기"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CancelRentalDialog;
