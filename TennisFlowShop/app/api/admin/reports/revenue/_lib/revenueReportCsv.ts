import type { RevenueReportResponse, RevenueReportSnapshotStatus } from "@/types/admin/reports";

const METHOD_LABELS = {
  cash: "현금",
  card: "매장 카드",
  bank_transfer: "계좌이체",
  etc: "기타",
} as const;

type RevenueReportSnapshotCsvMeta = {
  yyyymm: string;
  status: RevenueReportSnapshotStatus;
  savedAt?: string | null;
  memo?: string | null;
};

function escapeCsvCell(value: unknown) {
  const text = value == null ? "" : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function toCsvRow(cells: unknown[]) {
  return cells.map(escapeCsvCell).join(",");
}

export function safeRevenueReportFilenameDate(value: string) {
  return value.replace(/[^0-9-]/g, "").slice(0, 10);
}

function buildCommonRows(report: RevenueReportResponse): unknown[][] {
  return [
    ["요약"],
    ["항목", "금액(원)", "건수", "비고"],
    ["온라인 정산 기준 매출", report.online.paidAmount, report.online.count, "기존 정산 기준 helper 재사용"],
    ["온라인 환불", report.online.refundedAmount, "", "기존 정산 환불 기준"],
    ["온라인 순매출", report.online.netAmount, "", "온라인 매출 - 온라인 환불"],
    ["오프라인 운영 매출", report.offline.paidAmount, "", "오프라인 summary 기준"],
    ["오프라인 환불", report.offline.refundedAmount, "", "오프라인 summary 기준"],
    ["오프라인 순매출", report.offline.netAmount, "", "오프라인 운영 매출 - 오프라인 환불"],
    ["오프라인 미결제", report.offline.pendingAmount, "", "참고 합계 결제완료 매출 제외"],
    ["온라인 + 오프라인 참고 합계", report.combinedPreview.paidAmount, "", "정산 지급액 계산에 사용되지 않습니다."],
    ["참고 합계 순매출", report.combinedPreview.netAmount, "", report.combinedPreview.note],
    ["패키지 발급 보정 필요 건수", "", report.offline.issueFailedCount ?? 0, "오프라인 패키지 발급 확인"],
    ["패키지 발급 보정 필요 금액", report.offline.issueFailedAmount ?? 0, "", "오프라인 패키지 발급 확인"],
    [],
    ["온라인 상세"],
    ["항목", "금액(원)"],
    ["일반 주문", report.online.bySource.orders],
    ["독립 스트링 신청", report.online.bySource.stringingApplications],
    ["온라인 패키지", report.online.bySource.packageOrders],
    ["대여", report.online.bySource.rentals],
    [],
    ["오프라인 상세"],
    ["항목", "금액(원)"],
    ["오프라인 작업/매출 기록", report.offline.recordsPaidAmount],
    ["오프라인 패키지 판매", report.offline.packageSalesPaidAmount],
    ["오프라인 미결제", report.offline.pendingAmount],
    ["오프라인 환불/차감", report.offline.refundedAmount],
    [],
    ["오프라인 결제수단별"],
    ["결제수단", "금액(원)", "비고"],
    ...Object.entries(METHOD_LABELS).map(([key, label]) => [label, report.offline.byMethod[key as keyof typeof METHOD_LABELS], "오프라인 결제완료 매출"]),
    [],
    ["추이"],
    ["날짜", "온라인 매출(원)", "오프라인 매출(원)", "참고 합계(원)"],
    ...report.series.map((point) => [point.date, point.onlinePaidAmount, point.offlinePaidAmount, point.combinedPaidAmount]),
  ];
}

function rowsToCsv(rows: unknown[][]) {
  return `\uFEFF${rows.map(toCsvRow).join("\r\n")}\r\n`;
}

export function buildRevenueReportCsv(report: RevenueReportResponse) {
  const rows: unknown[][] = [
    ["온라인/오프라인 매출 리포트"],
    ["기간", `${report.range.from} ~ ${report.range.to}`],
    ["그룹 기준", report.range.groupBy === "day" ? "일별" : "월별"],
    ["안내", "온라인 + 오프라인 참고 합계는 정산 지급액 계산에 사용되지 않습니다."],
    ["안내", "오프라인 현금/계좌이체/매장 카드 매출은 별도 운영 정산 대상입니다."],
    [],
    ...buildCommonRows(report),
  ];

  return rowsToCsv(rows);
}

export function buildRevenueReportSnapshotCsv(report: RevenueReportResponse, meta: RevenueReportSnapshotCsvMeta) {
  const rows: unknown[][] = [
    ["온라인/오프라인 매출 리포트 스냅샷"],
    ["스냅샷 월", meta.yyyymm],
    ["저장 상태", meta.status],
    ["저장일", meta.savedAt ?? ""],
    ["메모", meta.memo ?? ""],
    ["안내", "이 파일은 저장된 월별 스냅샷 기준입니다."],
    ["안내", "저장 이후 주문/환불/오프라인 기록 수정에 따라 현재 실시간 리포트와 차이가 날 수 있습니다."],
    ["안내", "온라인 + 오프라인 참고 합계는 정산 지급액 계산에 사용되지 않습니다."],
    ["안내", "오프라인 현금/계좌이체/매장 카드 매출은 별도 운영 정산 대상입니다."],
    [],
    ...buildCommonRows(report),
  ];

  return rowsToCsv(rows);
}
