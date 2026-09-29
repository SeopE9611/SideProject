"use client";

import { PriceSummary, type PriceSummaryRow } from "@/components/public/PriceSummary";
import { SummaryCard } from "@/components/public/SummaryCard";
import {
  BadgeDollarSign,
  Box,
  CalendarDays,
  Clock3,
  Package,
  ReceiptText,
  Store,
  Ticket,
} from "lucide-react";

type CollectionMethod = "self_ship" | "courier_pickup" | "visit";

interface PriceSummaryProps {
  preferredDate?: string;
  preferredTime?: string;
  collectionMethod?: CollectionMethod;
  stringTypes: string[];
  stringIncluded?: boolean; // 스트링 금액이 결제에 포함되는지(주문 기반/핸드오프 등)
  usingPackage: boolean;
  base: number;
  pickupFee: number;
  total: number;
  racketPrice?: number; // 라켓 금액(정보용)
  rentalDeposit?: number; // 대여 보증금(정보용)
  rentalFee?: number; // 대여료(정보용)
  stringPrice?: number; // 스트링 상품 금액(정보용)
  totalLabel?: string; // 합계 라벨 커스터마이징
  headerHint?: string; // 헤더 하단 안내문(대여/주문 기반에서 혼선 제거용)
  summaryTitle?: string;
  workLines?: Array<{
    racketType?: string;
    stringName?: string;
    tensionMain?: string;
    tensionCross?: string;
    mountingFee?: number;
  }>;
}

const won = (n: number) => n.toLocaleString("ko-KR") + "원";

export default function PriceSummaryCard({
  preferredDate,
  preferredTime,
  collectionMethod,
  stringTypes,
  stringIncluded = false,
  usingPackage,
  base,
  pickupFee,
  total,
  racketPrice = 0,
  rentalDeposit = 0,
  rentalFee = 0,
  stringPrice = 0,
  totalLabel,
  headerHint,
  summaryTitle,
  workLines,
}: PriceSummaryProps) {
  const isCustom = stringTypes.includes("custom");
  const isRentalBreakdown = Number(rentalDeposit) > 0 || Number(rentalFee) > 0;
  const visibleWorkLines = Array.isArray(workLines) ? workLines.slice(0, 3) : [];
  const hiddenWorkLineCount = Array.isArray(workLines)
    ? Math.max(workLines.length - visibleWorkLines.length, 0)
    : 0;
  const hasWorkLines = visibleWorkLines.length > 0;

  const MethodIcon = collectionMethod === "visit" ? Store : Box;
  const methodText = collectionMethod === "visit" ? "매장 방문" : "자가 발송";

  const pickupLabel = "라켓 전달비";
  const pickupHint =
    collectionMethod === "visit"
      ? "매장 방문: 없음"
      : collectionMethod === "self_ship"
        ? "자가 발송: 없음"
        : "—";

  const rows: PriceSummaryRow[] = [
    {
      id: "base",
      label: (
        <span className="flex items-center gap-2">
          <BadgeDollarSign className="h-4 w-4" />
          <span>교체비</span>
        </span>
      ),
      value: won(base),
      description: isCustom
        ? "보유/커스텀 스트링: 교체비만"
        : stringIncluded
          ? "스트링 상품: 주문/대여 결제 내역 우선"
          : "스트링 상품: 선택 상품과 신청 방식 기준 안내",
    },
  ];

  if (isRentalBreakdown) {
    if (rentalDeposit > 0) {
      rows.push({
        id: "rentalDeposit",
        label: (
          <span className="flex items-center gap-2">
            <Box className="h-4 w-4" />
            <span>보증금</span>
          </span>
        ),
        value: won(rentalDeposit),
      });
    }

    if (rentalFee > 0) {
      rows.push({
        id: "rentalFee",
        label: (
          <span className="flex items-center gap-2">
            <Box className="h-4 w-4" />
            <span>대여료</span>
          </span>
        ),
        value: won(rentalFee),
      });
    }
  } else if (racketPrice > 0) {
    rows.push({
      id: "racketPrice",
      label: (
        <span className="flex items-center gap-2">
          <Box className="h-4 w-4" />
          <span>라켓 금액</span>
        </span>
      ),
      value: won(racketPrice),
    });
  }

  if (stringPrice > 0) {
    rows.push({
      id: "stringPrice",
      label: (
        <span className="flex items-center gap-2">
          <ReceiptText className="h-4 w-4" />
          <span>스트링 금액</span>
        </span>
      ),
      value: won(stringPrice),
    });
  }

  if (pickupFee > 0) {
    rows.push({
      id: "pickupFee",
      label: (
        <span className="flex items-center gap-2">
          <Package className="h-4 w-4" />
          <span>{pickupLabel}</span>
        </span>
      ),
      value: `+ ${won(pickupFee)}`,
      description: pickupHint,
    });
  }

  if (usingPackage) {
    rows.push({
      id: "package",
      label: (
        <span className="flex items-center gap-2">
          <Ticket className="h-4 w-4 text-primary" />
          <span>패키지 적용</span>
        </span>
      ),
      value: <span className="text-primary">교체비 무료</span>,
    });
  }

  rows.push({
    id: "total",
    label: totalLabel ?? "예상 결제 금액",
    value: (
      <span className="tabular-nums" aria-live="polite">
        {won(total)}
      </span>
    ),
    emphasis: true,
  });

  return (
    <SummaryCard
      title={
        <span className="flex items-center gap-2">
          <ReceiptText className="h-4 w-4" />
          <span>{summaryTitle ?? "요금 요약"}</span>
        </span>
      }
      description={headerHint ?? "입력에 따라 실시간 반영됩니다"}
      className="overflow-hidden"
      contentClassName="space-y-4"
    >
      {/* 선택 요약 */}
      <div className="grid grid-cols-1 gap-3 rounded-xl border border-border bg-muted/20 p-4">
        <div className="flex items-center justify-between text-ui-body-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CalendarDays className="h-4 w-4" />
            <span>희망일</span>
          </div>
          <span className="tabular-nums">{preferredDate || "—"}</span>
        </div>
        <div className="flex items-center justify-between text-ui-body-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock3 className="h-4 w-4" />
            <span>시간대</span>
          </div>
          <span className="tabular-nums">{preferredTime || "—"}</span>
        </div>
        <div className="flex items-center justify-between text-ui-body-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MethodIcon className="h-4 w-4" />
            <span>라켓 전달 방식</span>
          </div>
          <span>{methodText}</span>
        </div>
      </div>

      {hasWorkLines && (
        <div className="space-y-2 rounded-xl border border-border bg-card p-3">
          <div className="flex flex-wrap items-center justify-between gap-1.5 text-ui-body-sm">
            <span className="font-semibold text-foreground">작업 {workLines?.length ?? 0}자루</span>
            <span className="text-ui-label leading-tight text-muted-foreground">
              1자루 = 교체 1회
            </span>
          </div>
          <div className="space-y-2">
            {visibleWorkLines.map((line, index) => {
              const racketName = line.racketType?.trim() || `라켓 ${index + 1}`;
              const stringName = line.stringName?.trim() || "스트링명 미입력";
              const main = line.tensionMain?.trim();
              const cross = line.tensionCross?.trim();
              const tension = main || cross ? `${main || "—"}-${cross || "—"}LB` : "텐션 미입력";
              return (
                <div
                  key={`${racketName}-${index}`}
                  className="rounded-lg bg-muted/30 p-2 text-ui-label leading-relaxed"
                >
                  <p className="truncate font-medium text-foreground">
                    {index + 1}. {racketName} / {stringName}
                  </p>
                  <p className="mt-0.5 break-words text-ui-micro leading-snug text-muted-foreground">
                    <span>{tension}</span>
                    <span className="mx-1">/</span>
                    <span>{won(Number(line.mountingFee ?? 0))}</span>
                  </p>
                </div>
              );
            })}
            {hiddenWorkLineCount > 0 && (
              <p className="text-ui-label text-muted-foreground">외 {hiddenWorkLineCount}건</p>
            )}
          </div>
        </div>
      )}

      <PriceSummary
        rows={rows}
        footer={
          usingPackage ? (
            <p className="text-ui-micro">※ 패키지 적용 시 교체비가 무료입니다.</p>
          ) : undefined
        }
      />
    </SummaryCard>
  );
}
