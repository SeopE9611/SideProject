"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminTypography } from "@/components/admin/admin-typography";
import { adminMutator } from "@/lib/admin/adminFetcher";
import { cn } from "@/lib/utils";
import {
  buildLinkedFlowStagePreview,
  getLinkedFlowStageLabelForDisplay,
  inferLinkedFlowStage,
  LINKED_FLOW_STAGE_LIST,
  LinkedFlowStage,
  mapStageToApplicationStatus,
  mapStageToOrderStatus,
} from "@/lib/admin/linked-flow-stage";
import { showErrorToast, showSuccessToast } from "@/lib/toast";

type LinkedFlowStagePatchResponse = {
  success?: boolean;
  message?: string;
  stage?: LinkedFlowStage;
  noop?: boolean;
  order?: {
    id?: string;
    previousStatus?: string;
    nextStatus?: string;
    paymentStatus?: string | null;
  };
  application?: {
    id?: string;
    previousStatus?: string;
    nextStatus?: string;
  };
  previewText?: string;
};

interface Props {
  orderId: string;
  orderStatus: string;
  applicationStatus: string;
  className?: string;
  disabled?: boolean;
  disabledReason?: string | null;
  shippingInfo?: any;
  onSaved?: (result: LinkedFlowStagePatchResponse) => Promise<void> | void;
}

export default function LinkedFlowStageCard({
  orderId,
  orderStatus,
  applicationStatus,
  className,
  disabled = false,
  disabledReason = null,
  shippingInfo,
  onSaved,
}: Props) {
  const currentStage = useMemo(
    () => inferLinkedFlowStage(orderStatus, applicationStatus),
    [orderStatus, applicationStatus],
  );
  const [selectedStage, setSelectedStage] = useState<LinkedFlowStage>(currentStage ?? "신청접수");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (currentStage) {
      setSelectedStage(currentStage);
    }
  }, [currentStage]);

  const nextStage = useMemo(() => {
    if (!currentStage) return null;
    const currentIndex = LINKED_FLOW_STAGE_LIST.indexOf(currentStage);
    return LINKED_FLOW_STAGE_LIST[currentIndex + 1] ?? null;
  }, [currentStage]);

  const correctionPreviewText = useMemo(() => {
    return buildLinkedFlowStagePreview({
      stage: selectedStage,
      orderPreviousStatus: orderStatus,
      orderNextStatus: mapStageToOrderStatus(selectedStage),
      applicationPreviousStatus: applicationStatus,
      applicationNextStatus: mapStageToApplicationStatus(selectedStage),
      shippingLike: shippingInfo,
    });
  }, [applicationStatus, orderStatus, selectedStage, shippingInfo]);

  const nextStagePreviewText = useMemo(() => {
    if (!nextStage) return null;
    return buildLinkedFlowStagePreview({
      stage: nextStage,
      orderPreviousStatus: orderStatus,
      orderNextStatus: mapStageToOrderStatus(nextStage),
      applicationPreviousStatus: applicationStatus,
      applicationNextStatus: mapStageToApplicationStatus(nextStage),
      shippingLike: shippingInfo,
    });
  }, [applicationStatus, nextStage, orderStatus, shippingInfo]);

  const isSameCorrectionStage = currentStage === selectedStage;

  const nextStageActionLabel = useMemo(() => {
    if (!nextStage) return null;
    const labels: Record<LinkedFlowStage, string> = {
      결제대기: "결제대기 처리",
      신청접수: "결제완료/신청 접수 처리",
      작업중: "교체 작업 시작",
      인도준비: "작업 완료 처리",
      인도완료: "인도 완료 처리",
    };
    return labels[nextStage];
  }, [nextStage]);

  const handleSave = (targetStage: LinkedFlowStage, emptyMessage = "변경 사항이 없습니다.") => {
    if (disabled) {
      if (disabledReason) showErrorToast(disabledReason);
      return;
    }

    if (currentStage === targetStage) {
      showSuccessToast(emptyMessage);
      return;
    }

    startTransition(async () => {
      try {
        const result = await adminMutator<LinkedFlowStagePatchResponse>(
          `/api/admin/linked-flows/order-stringing/${orderId}/stage`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ stage: targetStage }),
          },
        );

        if (!result?.success) {
          throw new Error(result?.message || "연결 진행 단계 변경에 실패했습니다.");
        }

        if (result.noop) {
          showSuccessToast(result.message || "변경 사항이 없습니다.");
        } else {
          showSuccessToast(
            result.message ||
              `교체 작업 단계를 '${getLinkedFlowStageLabelForDisplay(targetStage, shippingInfo)}'(으)로 처리했습니다.`,
          );
        }

        await onSaved?.(result);
      } catch (error: any) {
        const message = String(error?.message ?? "").trim();
        showErrorToast(message || "연결 진행 단계 변경 중 오류가 발생했습니다.");
      }
    });
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className={adminTypography.panelTitle}>연결 진행 단계 변경</CardTitle>
        <CardDescription className={adminTypography.meta}>
          통합 주문의 교체 작업 진행 단계를 다음 운영 단계로 처리합니다. 결제/작업 기록과 맞지 않는
          보정은 아래 직접 보정 영역에서만 사용하세요.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 rounded-xl border border-border/60 bg-background/70 p-4 sm:grid-cols-2">
          <div>
            <p className={adminTypography.panelTitle}>현재 연결 단계</p>
            <Badge variant="outline" className="mt-2 w-fit">
              {currentStage
                ? getLinkedFlowStageLabelForDisplay(currentStage, shippingInfo)
                : "판별 불가"}
            </Badge>
          </div>
          <div>
            <p className={adminTypography.panelTitle}>다음 처리 단계</p>
            <Badge variant="outline" className="mt-2 w-fit">
              {nextStage
                ? getLinkedFlowStageLabelForDisplay(nextStage, shippingInfo)
                : currentStage
                  ? "마지막 단계"
                  : "판별 불가"}
            </Badge>
          </div>
        </div>

        <div className="rounded-xl border border-primary/30 bg-primary/10 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <p className={cn(adminTypography.panelTitle, "text-primary")}>다음 단계로 처리</p>
              <p className={cn("leading-relaxed", adminTypography.body)}>
                {nextStage
                  ? `${getLinkedFlowStageLabelForDisplay(currentStage ?? nextStage, shippingInfo)} → ${getLinkedFlowStageLabelForDisplay(nextStage, shippingInfo)}`
                  : currentStage
                    ? "이미 마지막 연결 단계입니다."
                    : "현재 연결 단계를 판별할 수 없어 자동 다음 단계 처리를 제공하지 않습니다."}
              </p>
            </div>
            <Button
              size="lg"
              onClick={() => nextStage && handleSave(nextStage)}
              disabled={isPending || disabled || !nextStage}
            >
              {isPending ? "처리 중..." : nextStageActionLabel || "다음 단계 없음"}
            </Button>
          </div>
          {nextStagePreviewText ? (
            <div
              className={cn(
                "mt-3 rounded-md border bg-background/80 p-3 break-keep",
                adminTypography.meta,
              )}
            >
              <p className="mb-1 font-medium text-foreground">처리 시 함께 변경되는 상태</p>
              {nextStagePreviewText}
            </div>
          ) : null}
        </div>

        <details className="group rounded-xl border border-border/70 bg-muted/20 p-2">
          <summary
            className={cn(
              "flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-muted/30 [&::-webkit-details-marker]:hidden",
              adminTypography.panelTitle,
            )}
          >
            단계 직접 보정
            <span className="text-ui-label font-medium text-muted-foreground group-open:hidden">
              펼치기
            </span>
            <span className="hidden text-ui-label font-medium text-muted-foreground group-open:inline">
              접기
            </span>
          </summary>
          <div className="space-y-3 px-2 pb-2 pt-3">
            <div className="rounded-lg border border-warning/40 bg-background/80 p-3">
              <p className={adminTypography.warning}>
                상태 보정은 실제 결제/작업 기록과 맞지 않을 때만 사용하세요.
              </p>
              <p className={cn("mt-1 leading-relaxed", adminTypography.meta)}>
                결제완료 주문을 결제대기로 되돌리면 관리자/사용자 화면의 상태가 혼란스러울 수
                있습니다. 일반 운영 흐름은 위의 다음 단계 버튼을 사용하세요.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <div className="space-y-1">
                <p className={adminTypography.meta}>보정할 연결 단계</p>
                <Select
                  value={selectedStage}
                  onValueChange={(value) => setSelectedStage(value as LinkedFlowStage)}
                  disabled={isPending || disabled}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="연결 진행 단계를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {LINKED_FLOW_STAGE_LIST.map((stage) => (
                      <SelectItem key={stage} value={stage}>
                        {getLinkedFlowStageLabelForDisplay(stage, shippingInfo)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="outline"
                onClick={() => handleSave(selectedStage, "보정할 변경 사항이 없습니다.")}
                disabled={isPending || isSameCorrectionStage || disabled}
              >
                {isPending ? "저장 중..." : "보정 저장"}
              </Button>
            </div>

            <div
              className={cn(
                "rounded-md border bg-background/80 p-3 break-keep",
                adminTypography.meta,
              )}
            >
              <p className="mb-1 font-medium text-foreground">보정 저장 시 함께 변경되는 상태</p>
              {correctionPreviewText}
            </div>
          </div>
        </details>

        {disabledReason && <p className="text-xs text-destructive break-keep">{disabledReason}</p>}
        <p className={cn("break-keep leading-relaxed", adminTypography.meta)}>
          이 카드는 교체 작업 단계 변경 전용입니다. 반송/배송 정보 등록과 교체 작업 세부 확인은 아래
          정보 영역에서 처리하고, 취소/환불은 주문 상세의 취소/환불 액션을 사용하세요.
        </p>
      </CardContent>
    </Card>
  );
}
