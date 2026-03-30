"use client";

import { CheckCircle2, ClipboardList } from "lucide-react";

import type useCheckoutStringingServiceAdapter from "@/app/features/stringing-applications/hooks/useCheckoutStringingServiceAdapter";
import { Badge } from "@/components/ui/badge";

type CheckoutStringingServiceAdapter = ReturnType<
  typeof useCheckoutStringingServiceAdapter
>;

type Props = {
  adapter: CheckoutStringingServiceAdapter;
};

export default function CheckoutStringingSummaryCard({ adapter }: Props) {
  const { summary, completion, visitTimeRange, visitSlotCountUi } = adapter;
  const reservationLabel =
    summary.reservationLabel && visitTimeRange && visitSlotCountUi > 1
      ? `${summary.reservationLabel} (${visitTimeRange.start}~${visitTimeRange.end}, ${visitSlotCountUi}슬롯)`
      : summary.reservationLabel;

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-primary" />
            교체 서비스 요약
          </p>
          <p className="text-xs text-muted-foreground mt-1">주문과 함께 접수될 내용을 미리 확인하세요.</p>
        </div>
        <Badge variant={completion.isReadyToSubmit ? "success" : "secondary"}>
          {completion.statusLabel}
        </Badge>
      </div>

      <div className="grid grid-cols-1 bp-sm:grid-cols-2 gap-2 text-sm">
        <p><span className="text-muted-foreground">접수 방식:</span> <span className="font-medium">{summary.collectionLabel}</span></p>
        <p><span className="text-muted-foreground">작업 수량:</span> <span className="font-medium">{summary.lineCount}자루</span></p>
        <p><span className="text-muted-foreground">선택 스트링:</span> <span className="font-medium">{summary.stringNames.join(", ") || "미선택"}</span></p>
        <p><span className="text-muted-foreground">텐션:</span> <span className="font-medium">{summary.tensionSummary}</span></p>
        {reservationLabel && (
          <p><span className="text-muted-foreground">예약 정보:</span> <span className="font-medium">{reservationLabel}</span></p>
        )}
        <p><span className="text-muted-foreground">교체 서비스 비용:</span> <span className="font-medium">{summary.priceLabel}</span></p>
        <p><span className="text-muted-foreground">추가 요청:</span> <span className="font-medium">{summary.requestPreview}</span></p>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <Badge variant={completion.basicConfigured ? "success" : "secondary"}>기본 설정 {completion.basicConfigured ? "완료" : "미완료"}</Badge>
        <Badge variant={completion.lineConfiguredCount === completion.totalLineCount && completion.totalLineCount > 0 ? "success" : "secondary"}>
          라켓별 설정 {completion.lineConfiguredCount}/{completion.totalLineCount} 완료
        </Badge>
        {completion.needsVisitReservation && (
          <Badge variant={completion.hasReservation ? "success" : "warning"}>방문 예약 {completion.hasReservation ? "완료" : "필요"}</Badge>
        )}
        {!completion.needsVisitReservation && (
          <Badge variant="secondary">방문 예약 없음</Badge>
        )}
        <Badge variant={summary.requestPreview === "없음" ? "secondary" : "success"}>
          추가 요청 {summary.requestPreview === "없음" ? "없음" : "입력됨"}
        </Badge>
      </div>

      {completion.isReadyToSubmit && (
        <p className="text-xs text-foreground flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
          현재 설정으로 주문과 함께 교체 서비스가 접수됩니다.
        </p>
      )}
    </div>
  );
}
