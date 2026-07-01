"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { mutate } from "swr";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { XCircle } from "lucide-react";
import { useUnsavedChangesGuard } from "@/lib/hooks/useUnsavedChangesGuard";
import {
  getAdminCancelPolicyMessage,
  isAdminForceCancelRequired,
} from "@/lib/orders/cancel-refund-policy";

const CANCEL_REASONS = ["상품 품절", "고객 요청", "배송 지연", "결제 오류", "기타"];

interface Props {
  orderId: string;
  disabled?: boolean;
  status?: string | null;
  hasTrackingNumber?: boolean;
  needsCancelFinalization?: boolean;
  /**
   * 취소가 성공했을 때 호출할 콜백
   * (OrderDetailClient로부터 내려받은 mutateOrder/ mutateHistory를 쓸 수도 있지만,
   * 여기서는 전역 mutate(...) 방식을 사용)
   */
  onCancelSuccess?: (reason: string, detail?: string) => Promise<void>;
}

export default function AdminCancelOrderDialog({
  orderId,
  disabled,
  status,
  hasTrackingNumber = false,
  needsCancelFinalization = false,
  onCancelSuccess,
}: Props) {
  const [open, setOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [detail, setDetail] = useState("");
  const [loading, setLoading] = useState(false);
  const forceRequired = isAdminForceCancelRequired(status, hasTrackingNumber);
  const policyMessage = getAdminCancelPolicyMessage(status, hasTrackingNumber);

  /**
   * 취소 다이얼로그 입력 이탈 방지
   * - 다이얼로그가 열린 상태에서 사유/상세를 입력했다면 dirty
   */
  const isDirty = open && (selectedReason !== "" || detail.trim().length > 0);
  useUnsavedChangesGuard(isDirty);

  const handleSubmit = async () => {
    if (!selectedReason) {
      showErrorToast("취소 사유를 선택해주세요.");
      return;
    }

    setLoading(true);
    try {
      // 서버에 관리자 취소 승인 요청
      const res = await fetch(`/api/orders/${orderId}/cancel-approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          // 관리자 선택 사유 → reasonCode
          reasonCode: selectedReason,
          // 기타 선택 시만 상세 사유 전달
          reasonText: selectedReason === "기타" ? detail : undefined,
          force: forceRequired ? true : undefined,
        }),
      });

      if (!res.ok) {
        const message = await res.text().catch(() => "");
        throw new Error(message || "서버 오류");
      }

      showSuccessToast("주문 취소 처리가 완료되었습니다.");

      // ─ SWR 캐시 재검증 ─
      // 주문 상태 뱃지
      await mutate(`/api/orders/${orderId}/status`);
      // 주문 상세
      await mutate(`/api/orders/${orderId}`);
      // 처리 이력 (무한스크롤 키 전체)
      await mutate(
        (key: string) =>
          typeof key === "string" && key.startsWith(`/api/orders/${orderId}/history`),
      );
      // 관리자 주문 목록
      await mutate((key) => typeof key === "string" && key.startsWith("/api/orders"));

      // OrderDetailClient 쪽에서 넘겨 준 옵티미스틱 콜백이 있다면 호출
      if (onCancelSuccess) {
        await onCancelSuccess(selectedReason, detail);
      }

      // 이력 페이지 번호 리셋 이벤트 (이미 사용 중인 패턴 유지)
      window.dispatchEvent(new Event("order-history-page-reset"));

      // 모달 닫기
      setOpen(false);
    } catch (err: any) {
      console.error("취소 처리 중 오류:", err);
      showErrorToast(`주문 취소 처리에 실패했습니다: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" disabled={disabled || loading} size="sm">
          <XCircle className="mr-2 h-4 w-4" />
          {needsCancelFinalization ? "주문 취소 후처리" : forceRequired ? "강제 취소" : "주문 취소"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{needsCancelFinalization ? "주문 취소 후처리" : forceRequired ? "관리자 강제 취소" : "주문 취소"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 py-4">
          {needsCancelFinalization ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-ui-body-sm text-destructive">
              <p className="font-semibold">PG 결제취소 후처리 확인</p>
              <p className="mt-1">
                PG 결제는 이미 취소된 상태입니다. 이 작업은 주문 상태를 취소로 정리하고, 재고 복구, 포인트 복원/회수, 연결 교체서비스 취소 등 내부 후처리를 진행합니다.
              </p>
              <p className="mt-1">{policyMessage}</p>
            </div>
          ) : forceRequired ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-ui-body-sm text-destructive">
              <p className="font-semibold">관리자 강제 취소 확인</p>
              <p className="mt-1">
                이 주문은 일반 사용자 취소가 불가능한 상태입니다. 관리자는 운영상 강제
                취소할 수 있지만, 결제취소, 포인트 회수/복구, 재고 복구, 연결된
                교체서비스 취소가 함께 처리될 수 있습니다. 실제 상품 회수 여부와 CS
                상황을 확인한 뒤 진행하세요.
              </p>
              <p className="mt-1">{policyMessage}</p>
            </div>
          ) : (
            <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-ui-body-sm text-foreground/80">
              {policyMessage}
            </div>
          )}
          <Label>취소 사유</Label>
          <Select onValueChange={setSelectedReason} value={selectedReason}>
            <SelectTrigger>
              <SelectValue placeholder="사유 선택" />
            </SelectTrigger>
            <SelectContent>
              {CANCEL_REASONS.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedReason === "기타" && (
            <Textarea
              className="mt-2"
              placeholder="기타 사유 입력"
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
            />
          )}
        </div>

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={loading || !selectedReason}>
            확인
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
