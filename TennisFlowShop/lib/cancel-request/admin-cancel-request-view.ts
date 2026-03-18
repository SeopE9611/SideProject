import { getRefundBankLabel } from "@/lib/cancel-request/refund-account";

export type AdminCancelRequestViewStatus =
  | "none"
  | "requested"
  | "approved"
  | "rejected";
export type AdminCancelRequestSubject = "order" | "rental" | "application";

export type AdminCancelRequestView = {
  status: Exclude<AdminCancelRequestViewStatus, "none">;
  badgeLabel: string;
  description: string;
  reasonSummary: string;
  tone: "warning" | "success" | "destructive";
  refundAccount: {
    bankLabel: string;
    account: string;
    holder: string;
  } | null;
};

type CancelRequestLike = {
  status?: string | null;
  reasonCode?: string | null;
  reasonText?: string | null;
  refundAccount?: {
    bank?: string | null;
    account?: string | null;
    holder?: string | null;
  } | null;
};

const statusAliasMap: Record<string, AdminCancelRequestViewStatus> = {
  requested: "requested",
  승인: "approved",
  approved: "approved",
  rejected: "rejected",
  거절: "rejected",
  요청: "requested",
  none: "none",
};

const subjectLabel: Record<AdminCancelRequestSubject, string> = {
  order: "주문",
  rental: "대여",
  application: "신청",
};

export function normalizeAdminCancelRequestStatus(
  rawStatus?: string | null,
): AdminCancelRequestViewStatus {
  if (!rawStatus) return "none";
  return statusAliasMap[String(rawStatus).trim()] ?? "none";
}

export function buildAdminCancelRequestView(
  cancelRequest: CancelRequestLike | null | undefined,
  subject: AdminCancelRequestSubject,
): AdminCancelRequestView | null {
  const status = normalizeAdminCancelRequestStatus(cancelRequest?.status);
  if (status === "none") return null;

  const reasonCode = String(cancelRequest?.reasonCode ?? "").trim();
  const reasonText = String(cancelRequest?.reasonText ?? "").trim();
  const reasonSummary = reasonCode
    ? `${reasonCode}${reasonText ? ` (${reasonText})` : ""}`
    : reasonText;

  const refundAccount = cancelRequest?.refundAccount
    ? {
        bankLabel: getRefundBankLabel(cancelRequest.refundAccount.bank),
        account: String(cancelRequest.refundAccount.account ?? "").trim(),
        holder: String(cancelRequest.refundAccount.holder ?? "").trim(),
      }
    : null;

  const noun = subjectLabel[subject];
  if (status === "requested") {
    return {
      status,
      badgeLabel: "취소요청",
      description: "취소 요청이 접수된 항목입니다.",
      reasonSummary,
      tone: "warning",
      refundAccount,
    };
  }

  if (status === "approved") {
    return {
      status,
      badgeLabel: "취소승인",
      description: `${noun} 취소 요청이 승인되었습니다.`,
      reasonSummary,
      tone: "success",
      refundAccount,
    };
  }

  return {
    status,
    badgeLabel: "취소거절",
    description: `${noun} 취소 요청이 거절되었습니다.`,
    reasonSummary,
    tone: "destructive",
    refundAccount,
  };
}
