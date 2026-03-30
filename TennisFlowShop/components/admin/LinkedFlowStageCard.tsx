"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminMutator } from "@/lib/admin/adminFetcher";
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
  const [selectedStage, setSelectedStage] = useState<LinkedFlowStage>(
    currentStage ?? "신청접수",
  );
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (currentStage) {
      setSelectedStage(currentStage);
    }
  }, [currentStage]);

  const previewText = useMemo(() => {
    return buildLinkedFlowStagePreview({
      stage: selectedStage,
      orderPreviousStatus: orderStatus,
      orderNextStatus: mapStageToOrderStatus(selectedStage),
      applicationPreviousStatus: applicationStatus,
      applicationNextStatus: mapStageToApplicationStatus(selectedStage),
      shippingLike: shippingInfo,
    });
  }, [applicationStatus, orderStatus, selectedStage, shippingInfo]);

  const isSameStage = currentStage === selectedStage;

  const handleSave = () => {
    if (disabled) {
      if (disabledReason) showErrorToast(disabledReason);
      return;
    }

    if (isSameStage) {
      showSuccessToast("변경 사항이 없습니다.");
      return;
    }

    startTransition(async () => {
      try {
        const result = await adminMutator<LinkedFlowStagePatchResponse>(
          `/api/admin/linked-flows/order-stringing/${orderId}/stage`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ stage: selectedStage }),
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
              `연결 진행 단계를 '${getLinkedFlowStageLabelForDisplay(selectedStage, shippingInfo)}'(으)로 저장했습니다.`,
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
        <CardTitle className="text-base">연결 진행 단계</CardTitle>
        <CardDescription>
          연결된 주문/신청서의 일반 흐름을 함께 변경하는 단축 조작입니다. 개별 상태 조정은 아래 주문 상태/신청 상태 영역에서 따로 처리하세요.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">현재 단계</span>
          <Badge variant="outline">
            {currentStage
              ? getLinkedFlowStageLabelForDisplay(currentStage, shippingInfo)
              : "판별 불가"}
          </Badge>
        </div>

        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">단계 선택</p>
            <Select
              value={selectedStage}
              onValueChange={(value) =>
                setSelectedStage(value as LinkedFlowStage)
              }
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
            onClick={handleSave}
            disabled={isPending || isSameStage || disabled}
          >
            {isPending ? "저장 중..." : "저장"}
          </Button>
        </div>

        <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground break-keep">
          {previewText}
        </div>
        {disabledReason && (
          <p className="text-xs text-destructive break-keep">
            {disabledReason}
          </p>
        )}
        <p className="text-xs text-muted-foreground break-keep">
          이 카드는 연결된 주문+신청의 일반 진행 단계만 함께 조정합니다.
          취소/환불/구매확정 및 개별 상태 관리는 각 상세의 개별 상태 영역을
          사용해 주세요.
        </p>
      </CardContent>
    </Card>
  );
}
