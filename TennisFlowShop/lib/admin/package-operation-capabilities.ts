export type AdminPackageOperationCapabilities = {
  canExtend: boolean;
  canAdjustSessions: boolean;
  blockReasons: string[];
};

type AdminPackageOperationInput = {
  paymentStatus: unknown;
  hasIssuedPass: boolean;
  passStatus: unknown;
  expiresAt: unknown;
  remainingCount: unknown;
  now: Date;
};

const allowedPassStatuses = new Set(["active", "paused", "expired", "suspended"]);
const cancelledPassStatuses = new Set(["cancelled", "canceled", "취소"]);

function normalizePassStatus(status: unknown): string | null {
  if (typeof status !== "string") return null;
  const normalized = status.trim().toLowerCase();
  return normalized || null;
}

function isExpired(expiresAt: unknown, now: Date): boolean {
  return expiresAt instanceof Date && Number.isFinite(expiresAt.getTime()) && expiresAt <= now;
}

/** 상세 조회와 mutation route가 공유하는 관리자 운영 작업 fail-closed 판정입니다. */
export function getAdminPackageOperationCapabilities({
  paymentStatus,
  hasIssuedPass,
  passStatus,
  expiresAt,
  remainingCount,
  now,
}: AdminPackageOperationInput): AdminPackageOperationCapabilities {
  const blockReasons: string[] = [];
  const normalizedPassStatus = normalizePassStatus(passStatus);

  if (paymentStatus !== "결제완료") blockReasons.push("결제완료 상태에서만 운영 작업을 할 수 있습니다.");
  if (!hasIssuedPass) blockReasons.push("연결된 이용권이 없어 운영 작업을 할 수 없습니다.");
  if (!normalizedPassStatus) blockReasons.push("이용권 상태를 확인할 수 없어 운영 작업을 할 수 없습니다.");
  else if (cancelledPassStatuses.has(normalizedPassStatus))
    blockReasons.push("취소된 이용권에서는 운영 작업을 할 수 없습니다.");
  else if (!allowedPassStatuses.has(normalizedPassStatus))
    blockReasons.push("이용권 상태를 확인할 수 없어 운영 작업을 할 수 없습니다.");

  const canExtend = blockReasons.length === 0;
  const canAdjustSessions =
    canExtend &&
    !isExpired(expiresAt, now) &&
    typeof remainingCount === "number" &&
    Number.isFinite(remainingCount);

  if (canExtend && isExpired(expiresAt, now))
    blockReasons.push("만료된 이용권은 연장 후 횟수를 조절할 수 있습니다.");
  else if (canExtend && (typeof remainingCount !== "number" || !Number.isFinite(remainingCount)))
    blockReasons.push("현재 잔여 횟수를 확인할 수 없어 횟수를 조절할 수 없습니다.");

  return { canExtend, canAdjustSessions, blockReasons };
}
