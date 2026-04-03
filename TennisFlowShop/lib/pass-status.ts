import type { ServicePass } from "@/lib/types/pass";

export type AdminPassStatusKo =
  | "취소"
  | "종료"
  | "만료"
  | "대기"
  | "비활성"
  | "활성";

export function isPassCancelled(status?: ServicePass["status"] | null) {
  return status === "cancelled";
}

export function isCountEnded(remainingCount?: number | null) {
  return Number(remainingCount ?? 0) <= 0;
}

export function isTimeExpired(expiresAt?: Date | string | null, now = new Date()) {
  if (!expiresAt) return false;
  const expiry = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  if (Number.isNaN(expiry.getTime())) return false;
  return expiry.getTime() <= now.getTime();
}

export function shouldRestoreActive(params: {
  paymentStatus?: string | null;
  passStatus?: ServicePass["status"] | null;
  remainingCount?: number | null;
  expiresAt?: Date | string | null;
  now?: Date;
}) {
  const now = params.now ?? new Date();
  if (params.paymentStatus !== "결제완료") return false;
  if (isPassCancelled(params.passStatus)) return false;
  if (isCountEnded(params.remainingCount)) return false;
  if (isTimeExpired(params.expiresAt, now)) return false;
  return true;
}

export function resolveAdminPassStatusKo(params: {
  paymentStatus?: string | null;
  passStatus?: ServicePass["status"] | null;
  remainingCount?: number | null;
  expiresAt?: Date | string | null;
  hasPass: boolean;
  now?: Date;
}): AdminPassStatusKo {
  const now = params.now ?? new Date();
  if (params.paymentStatus === "결제취소" || isPassCancelled(params.passStatus))
    return "취소";
  if (!params.hasPass) return "대기";
  if (isCountEnded(params.remainingCount)) return "종료";
  if (isTimeExpired(params.expiresAt, now)) return "만료";
  if (
    params.passStatus === "paused" ||
    params.passStatus === "suspended" ||
    params.paymentStatus !== "결제완료"
  )
    return "비활성";
  return "활성";
}
