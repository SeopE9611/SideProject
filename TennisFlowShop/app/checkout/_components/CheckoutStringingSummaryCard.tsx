"use client";

import { CheckCircle2, CircleDot, ClipboardList } from "lucide-react";

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
  const lineConfiguredDone =
    completion.lineConfiguredCount === completion.totalLineCount &&
    completion.totalLineCount > 0;
  const statusMessage = completion.isReadyToSubmit
    ? "현재 설정으로 주문과 함께 교체서비스가 접수됩니다."
    : completion.needsVisitReservation && !completion.hasReservation
      ? "방문 예약만 완료하면 접수 준비가 완료됩니다."
      : "추가 요청 없이 현재 설정으로 접수됩니다.";

  return (
    <div className="space-y-4 rounded-xl border border-border/70 bg-secondary/20 px-4 py-5 bp-sm:px-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <ClipboardList className="h-4 w-4 text-primary" />
            교체서비스 요약
          </p>
          <p className="mt-1.5 text-xs text-foreground/75">
            주문과 함께 접수될 내용을 미리 확인하세요.
          </p>
        </div>
        <Badge
          variant={completion.isReadyToSubmit ? "success" : "secondary"}
          className="mt-0.5 border border-border/70 bg-background/85"
        >
          {completion.statusLabel}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-x-5 gap-y-2.5 rounded-lg border border-border/70 bg-background p-3.5 text-sm bp-sm:grid-cols-2">
        <p><span className="text-muted-foreground">접수 방식:</span> <span className="font-medium">{summary.collectionLabel}</span></p>
        <p><span className="text-muted-foreground">작업 수량:</span> <span className="font-medium">{summary.lineCount}자루</span></p>
        <p><span className="text-muted-foreground">선택 스트링:</span> <span className="font-medium">{summary.stringNames.join(", ") || "미선택"}</span></p>
        <p><span className="text-muted-foreground">텐션:</span> <span className="font-medium">{summary.tensionSummary}</span></p>
        {reservationLabel && (
          <p><span className="text-muted-foreground">예약 정보:</span> <span className="font-medium">{reservationLabel}</span></p>
        )}
        <p><span className="text-muted-foreground">교체서비스 비용:</span> <span className="font-medium">{summary.priceLabel}</span></p>
        <p><span className="text-muted-foreground">추가 요청:</span> <span className="font-medium">{summary.requestPreview}</span></p>
      </div>

      <div className="rounded-lg border border-border/70 bg-background/70 p-3">
        <p className="mb-2 text-xs font-medium tracking-wide text-foreground/75">
          진행 상태
        </p>
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge
            variant={completion.basicConfigured ? "success" : "secondary"}
            className="gap-1 border border-border/70 font-normal"
          >
            <CircleDot className="h-3 w-3" />
            기본 설정 {completion.basicConfigured ? "완료" : "미완료"}
          </Badge>
          <Badge
            variant={lineConfiguredDone ? "success" : "secondary"}
            className="gap-1 border border-border/70 font-normal"
          >
            <CircleDot className="h-3 w-3" />
            라켓별 설정 {completion.lineConfiguredCount}/{completion.totalLineCount} 완료
          </Badge>
          {completion.needsVisitReservation && (
            <Badge
              variant={completion.hasReservation ? "success" : "warning"}
              className="gap-1 border border-border/70 font-normal"
            >
              <CircleDot className="h-3 w-3" />
              방문 예약 {completion.hasReservation ? "완료" : "필요"}
            </Badge>
          )}
          {!completion.needsVisitReservation && (
            <Badge variant="secondary" className="gap-1 border border-border/70 font-normal">
              <CircleDot className="h-3 w-3" />
              방문 예약 없음
            </Badge>
          )}
          <Badge
            variant={summary.requestPreview === "없음" ? "secondary" : "success"}
            className="gap-1 border border-border/70 font-normal"
          >
            <CircleDot className="h-3 w-3" />
            추가 요청 {summary.requestPreview === "없음" ? "없음" : "입력됨"}
          </Badge>
        </div>
      </div>

      <p className="flex items-center gap-1.5 border-t border-border/70 pt-1 text-xs text-foreground">
        {completion.isReadyToSubmit ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
        ) : (
          <CircleDot className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        {statusMessage}
      </p>
    </div>
  );
}
