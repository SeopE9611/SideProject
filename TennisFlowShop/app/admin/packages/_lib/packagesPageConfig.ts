import { adminFetcher } from "@/lib/admin/adminFetcher";
import type {
  AdminPackageDetailDto,
  AdminPackageListItemDto,
  AdminPackageListResponseDto,
  AdminPackageMetricsDto,
  AdminPackagePassStatus,
  AdminPackagePaymentStatus,
  AdminPackageServiceType,
  AdminPackageType,
} from "@/types/admin/packages";

export type PackageOrder = AdminPackageDetailDto;

export type PackageType = AdminPackageType;
export type ServiceType = AdminPackageServiceType;
export type PassStatus = AdminPackagePassStatus;
export type PaymentStatus = AdminPackagePaymentStatus;
export type SortKey =
  | "customer"
  | "purchaseDate"
  | "expiryDate"
  | "remainingSessions"
  | "price"
  | "status"
  | "payment"
  | "package"
  | "progress";

export const PASS_STATUS_LABELS: Record<PassStatus, string> = {
  비활성: "비활성",
  활성: "활성",
  종료: "종료",
  만료: "만료",
  취소: "취소",
};

export const packageStatusColors: Record<PassStatus | "대기", string> = {
  비활성: "bg-muted text-muted-foreground border-border",
  활성: "bg-success/10 text-success border-border dark:bg-success/15",
  종료: "bg-background text-foreground border-border",
  만료: "bg-background text-foreground border-border",
  취소: "bg-destructive/10 text-destructive border-destructive/30 dark:bg-destructive/15",
  대기: "bg-background text-foreground border-border",
};

export type PackageListItem = AdminPackageListItemDto;

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type PackageMetrics = AdminPackageMetricsDto;

export type PackagesResponse = AdminPackageListResponseDto;

export const badgeSizeCls = "px-2.5 py-0.5 text-xs leading-[1.05] rounded-md";

export function normalizePackagePaymentStatus(status?: string | null): PaymentStatus {
  if (status === "결제완료" || status === "결제대기" || status === "결제취소") return status;
  const lower = String(status ?? "")
    .trim()
    .toLowerCase();
  if (lower === "paid" || lower === "payment_completed") return "결제완료";
  if (lower === "pending") return "결제대기";
  if (lower === "canceled" || lower === "cancelled") return "결제취소";
  return "결제대기";
}

export const packageTypeColors: Record<PackageType, string> = {
  "10회권": "bg-muted text-foreground border-border",
  "30회권": "bg-primary/10 text-primary border-border dark:bg-primary/20",
  "50회권": "bg-success/10 text-success border-border dark:bg-success/15",
  "100회권": "bg-warning/10 text-warning border-border dark:bg-warning/15",
};

export const fetcher = adminFetcher;

export const DEFAULT_PACKAGE_LIST_FILTERS = {
  page: 1 as number,
  limit: 10 as number,
  status: "all" as "all" | PassStatus,
  package: "all" as "all" | PackageType,
  payment: "all" as "all" | PaymentStatus,
  service: "all" as "all" | ServiceType,
  sortBy: null as SortKey | null,
  sortDirection: "asc" as "asc" | "desc",
  q: "" as string,
};

export function getAdminPackagePaymentLabel(
  state: import("@/types/admin/packages").AdminPackagePaymentState,
) {
  return (
    {
      not_required: "결제 불필요",
      bank_pending: "입금 확인 대기",
      pg_pending: "PG 승인 확인 대기",
      pending: "결제 확인 대기",
      paid: "결제 완료",
      failed: "결제 실패",
      cancelled: "결제 취소",
      refunding: "환불 처리 중",
      refunded: "환불 완료",
      unknown: "결제 상태 미확인",
    } as const
  )[state];
}
export function getAdminPackageUsageLabel(
  state: import("@/types/admin/packages").AdminPackageUsageState,
) {
  return (
    {
      available: "사용 가능",
      paused: "일시정지",
      exhausted: "횟수 소진",
      expired: "기간 만료",
      cancelled: "이용권 취소",
      not_issued: "미발급",
      unknown: "이용권 상태 미확인",
    } as const
  )[state];
}
export function getAdminPackageActivationLabel(
  state: import("@/types/admin/packages").AdminPackageActivationState,
) {
  return (
    {
      active: "활성화 완료",
      awaiting_payment: "결제 확인 후 활성화",
      pending_issue: "발급 처리 중",
      paused: "활성화 일시정지",
      ended: "이용 종료",
      cancelled: "활성화 취소",
      failed: "발급 처리 실패",
      unknown: "활성화 상태 미확인",
    } as const
  )[state];
}
export function getAdminPackageAttentionReasonLabel(
  reason: import("@/types/admin/packages").AdminPackageAttentionReason,
) {
  return (
    {
      payment_pending: "결제 확인 필요",
      payment_failed: "결제 실패 확인 필요",
      payment_refunding: "환불 진행 확인 필요",
      payment_unknown: "결제 상태 확인 필요",
      pass_issue_pending: "패스 발급 확인 필요",
      pass_paused: "일시정지 상태 확인 필요",
      pass_unknown: "패스 상태 확인 필요",
      terminal_payment_with_live_pass: "결제 종료·이용권 상태 불일치",
    } as const
  )[reason];
}
