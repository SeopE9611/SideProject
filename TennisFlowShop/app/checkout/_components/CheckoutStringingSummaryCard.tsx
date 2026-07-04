"use client";

import { CheckCircle2, CircleDot, ClipboardList } from "lucide-react";

import type useCheckoutStringingServiceAdapter from "@/app/features/stringing-applications/hooks/useCheckoutStringingServiceAdapter";
import { Badge } from "@/components/ui/badge";

type CheckoutStringingServiceAdapter = ReturnType<typeof useCheckoutStringingServiceAdapter>;

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
    completion.lineConfiguredCount === completion.totalLineCount && completion.totalLineCount > 0;
  const statusMessage = completion.isReadyToSubmit
    ? "교체서비스 접수 준비가 완료되었습니다."
    : completion.needsVisitReservation && !completion.hasReservation
      ? "방문 예약과 필수 작업 정보를 확인해 주세요."
      : "라켓명과 텐션을 입력해 주세요.";

  return (
    <div className="space-y-3 border-t border-border/70 pt-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-ui-body-sm font-medium text-foreground">
            <ClipboardList className="h-4 w-4 text-primary" />
            교체서비스 요약
          </p>
          <p className="mt-1 break-keep text-ui-label text-foreground/75">
            금액과 접수 상태만 간단히 확인하세요.
          </p>
        </div>
        <Badge
          variant={completion.isReadyToSubmit ? "success" : "secondary"}
          className="mt-0.5 shrink-0 border border-border/70 bg-transparent text-ui-micro"
        >
          {completion.statusLabel}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-x-5 gap-y-2 text-ui-body-sm bp-sm:grid-cols-2">
        <p>
          <span className="text-muted-foreground">접수 방식:</span>{" "}
          <span className="font-medium">{summary.collectionLabel}</span>
        </p>
        <p>
          <span className="text-muted-foreground">작업 수량:</span>{" "}
          <span className="font-medium">{summary.lineCount}자루</span>
        </p>
        <p>
          <span className="text-muted-foreground">선택 스트링:</span>{" "}
          <span className="font-medium">{summary.stringNames.join(", ") || "미선택"}</span>
        </p>
        <p>
          <span className="text-muted-foreground">텐션:</span>{" "}
          <span className="font-medium">{summary.tensionSummary}</span>
        </p>
        {reservationLabel && (
          <p>
            <span className="text-muted-foreground">예약:</span>{" "}
            <span className="font-medium">{reservationLabel}</span>
          </p>
        )}
        <p>
          <span className="text-muted-foreground">장착비:</span>{" "}
          <span className="font-medium">{summary.priceLabel}</span>
        </p>
        {summary.requestPreview !== "없음" && (
          <p className="bp-sm:col-span-2">
            <span className="text-muted-foreground">작업 요청:</span>{" "}
            <span className="font-medium">{summary.requestPreview}</span>
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2 text-ui-label">
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
          필수 정보 {completion.lineConfiguredCount}/{completion.totalLineCount}
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
      </div>

      <p className="flex items-center gap-1.5 border-t border-border/70 pt-2 text-ui-label text-foreground">
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
