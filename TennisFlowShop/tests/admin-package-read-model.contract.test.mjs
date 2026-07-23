import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = (p) => readFileSync(p, "utf8");
const helper = read("lib/admin/package-state-read-model.ts"),
  list = read("app/api/admin/package-orders/route.ts"),
  detail = read("app/api/admin/package-orders/[id]/route.ts"),
  types = read("types/admin/packages.ts"),
  ui = read("app/admin/packages/page.tsx");
assert.match(helper, /import "server-only"/);
assert.match(helper, /buildAdminPackageStateStages/);
assert.match(list, /buildAdminPackageStateStages/);
assert.match(detail, /buildAdminPackageStateStages/);
for (const value of [
  "AdminPackagePaymentState",
  "AdminPackageUsageState",
  "AdminPackageActivationState",
  "AdminPackageAttentionReason",
  "rawPaymentStatus",
  "AdminPackageOperationCapabilities",
  "operationCapabilities",
  "usageState",
  "activationState",
  "requiresAttention",
  "attentionReasons",
  "progressPercent",
])
  assert.match(types, new RegExp(value));
assert.match(list, /pending_any/);
assert.match(list, /metrics/);
assert.match(list, /paymentState.*paid/);
assert.match(ui, /이용권 상태/);
for (const value of [
  "export async function PATCH",
  "verifyAdminCsrf",
  "markPackageOrderPaid",
  "appendAdminAudit",
  "pass status sync error",
  "return NextResponse\\.json\\(\\{ ok: true \\}\\)",
])
  assert.match(detail, new RegExp(value));

assert.match(helper, /\$toLower/);
assert.match(helper, /legacyPassStatus/);
assert.match(helper, /legacyPaymentStatus/);
for (const value of ["활성", "일시정지", "종료", "만료", "취소", "대기"])
  assert.match(helper, new RegExp(value));
assert.doesNotMatch(detail, /passStatusKo/);
for (const value of ["legacyPassStatus", "legacyPaymentStatus"])
  assert.match(types, new RegExp(value));
for (const value of ["paymentStatusLabel", "usageStatusLabel", "activationStatusLabel"])
  assert.doesNotMatch(types, new RegExp(value));
assert.match(ui, /usageFilter/);
assert.match(ui, /activationFilter/);
assert.match(ui, /attentionFilter/);
assert.doesNotMatch(ui, /function computeListStatus/);
assert.doesNotMatch(ui, /function calcProgressPercent/);
assert.match(ui, /kpiNeedsAttention/);
assert.match(ui, /kpiRevenue/);
assert.match(ui, /kpiExpSoon/);

const detailUi = read("app/admin/packages/[id]/PackageDetailClient.tsx");
for (const value of [
  "available",
  "not_issued",
  "paused",
  "exhausted",
  "expired",
  "cancelled",
  "unknown",
  "pending_any",
  "bank_pending",
  "pg_pending",
  "pending",
  "paid",
  "failed",
  "refunding",
  "refunded",
  "not_required",
  "active",
  "awaiting_payment",
  "pending_issue",
  "ended",
  "needs_attention",
  "clear",
])
  assert.match(ui, new RegExp(`value="${value}"`));
for (const legacy of ["활성", "비활성", "결제완료", "결제대기", "결제취소"])
  assert.doesNotMatch(ui, new RegExp(`<SelectItem value="${legacy}">`));
for (const value of [
  'activationFilter !== "all"',
  'attentionFilter !== "all"',
  "운영 확인 필요",
  "사용 가능",
  "결제 확인 대기",
  "발급 처리 중",
  "결제·활성화 확인",
  'usageFilter: "available"',
  'paymentFilter: "paid"',
  'attentionFilter: "clear"',
  "normalizedSortKey",
  "전체 결과",
  "결제 완료 금액",
  "30일 내 만료",
  "xl:grid-cols-5",
  "결제 상태",
  "활성화 상태",
  "운영 확인",
  "운영 확인 사유 미확인",
  "colSpan=\\{13\\}",
  "grid-cols-13",
  "횟수 정보 확인 필요",
])
  assert.match(ui, new RegExp(value));
assert.ok(ui.includes("Array.from({ length: 13 })"));
assert.doesNotMatch(ui, /총 매출|만료 예정/);
assert.match(ui, /aria-label={`결제 상태 \$\{paymentLabel\}`}/);
assert.match(ui, /aria-label={`활성화 상태 \$\{activationLabel\}`}/);
for (const value of [
  "terminal_payment_with_live_pass",
  "payment_failed",
  "payment_refunding",
  "payment_unknown",
  "pass_issue_pending",
  "pass_unknown",
  "operationCapabilities",
  "blockReasons",
  "canExtendPackage",
  "canAdjustSessions",
  "disabled={!canExtendPackage}",
  "disabled={!canAdjustSessions}",
  "금액 확인 필요",
  "횟수 정보 확인 필요",
  "패스 미발급",
  "만료일 확인 필요",
  "현재 잔여 횟수를 확인할 수 없습니다",
  "총 횟수 확인 필요",
])
  assert.match(detailUi, new RegExp(value));
const capabilities = read("lib/admin/package-operation-capabilities.ts");
for (const value of [
  "getAdminPackageOperationCapabilities",
  "canExtend",
  "canAdjustSessions",
  "cancelled",
  "canceled",
  "취소",
  "Number.isFinite(remainingCount)",
  "expiresAt <= now",
])
  assert.match(capabilities, new RegExp(value));
for (const value of [
  /data\.paymentStatus === "결제완료"/,
  /data\.passStatus === "취소"/,
  /\(data\.remainingSessions \?\? 0\) <= 0/,
  /data\.price \?\? 0/,
  /\(data\.remainingSessions \?\? 0\) \+/,
])
  assert.doesNotMatch(detailUi, value);
