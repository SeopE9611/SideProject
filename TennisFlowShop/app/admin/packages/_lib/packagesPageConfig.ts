import { adminFetcher } from "@/lib/admin/adminFetcher";
import { badgeStyleSpec } from "@/lib/badge-style";
import type {
  AdminPackageActivationState,
  AdminPackageAttentionReason,
  AdminPackageDetailDto,
  AdminPackageListItemDto,
  AdminPackageListResponseDto,
  AdminPackageMetricsDto,
  AdminPackagePaymentState,
  AdminPackageServiceType,
  AdminPackageType,
  AdminPackageUsageState,
} from "@/types/admin/packages";

export type PackageOrder = AdminPackageDetailDto;
export type PackageType = AdminPackageType;
export type ServiceType = AdminPackageServiceType;
export type PackageUsageFilter = "all" | AdminPackageUsageState;
export type PackagePaymentFilter = "all" | "pending_any" | AdminPackagePaymentState;
export type PackageActivationFilter = "all" | AdminPackageActivationState;
export type PackageAttentionFilter = "all" | "needs_attention" | "clear";
export type SortKey =
  | "customer"
  | "purchaseDate"
  | "expiryDate"
  | "remainingSessions"
  | "price"
  | "package"
  | "progress"
  | "usage"
  | "payment"
  | "activation"
  | "attention";
export type PackageListItem = AdminPackageListItemDto;
export type PackageMetrics = AdminPackageMetricsDto;
export type PackagesResponse = AdminPackageListResponseDto;

export const badgeSizeCls = "px-2.5 py-0.5 text-xs leading-[1.05] rounded-md";
export const packageTypeColors: Record<PackageType, string> = {
  "10회권": "bg-muted text-foreground border-border",
  "30회권": "bg-primary/10 text-primary border-border dark:bg-primary/20",
  "50회권": "bg-success/10 text-success border-border dark:bg-success/15",
  "100회권": "bg-warning/10 text-warning border-border dark:bg-warning/15",
};
export const fetcher = adminFetcher;
export const DEFAULT_PACKAGE_LIST_FILTERS = {
  page: 1,
  limit: 10,
  usage: "all" as PackageUsageFilter,
  payment: "all" as PackagePaymentFilter,
  activation: "all" as PackageActivationFilter,
  attention: "all" as PackageAttentionFilter,
  package: "all" as "all" | PackageType,
  service: "all" as "all" | ServiceType,
  sortBy: null as SortKey | null,
  sortDirection: "asc" as "asc" | "desc",
  q: "",
};
export function getAdminPackagePaymentLabel(state: AdminPackagePaymentState) {
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
export function getAdminPackageUsageLabel(state: AdminPackageUsageState) {
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
export function getAdminPackageActivationLabel(state: AdminPackageActivationState) {
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
export function getAdminPackageAttentionReasonLabel(reason: AdminPackageAttentionReason) {
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
export const getAdminPackageUsageBadgeSpec = (state: AdminPackageUsageState) =>
  badgeStyleSpec(
    (
      {
        available: "success",
        paused: "warning",
        not_issued: "info",
        exhausted: "neutral",
        expired: "danger",
        cancelled: "danger",
        unknown: "warning",
      } as const
    )[state],
  );
export const getAdminPackageActivationBadgeSpec = (state: AdminPackageActivationState) =>
  badgeStyleSpec(
    (
      {
        active: "success",
        awaiting_payment: "warning",
        pending_issue: "info",
        paused: "warning",
        ended: "neutral",
        cancelled: "danger",
        failed: "danger",
        unknown: "warning",
      } as const
    )[state],
  );
export const getAdminPackageAttentionBadgeSpec = (requiresAttention: boolean) =>
  badgeStyleSpec(requiresAttention ? "warning" : "success");
