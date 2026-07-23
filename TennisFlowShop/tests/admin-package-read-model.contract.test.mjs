import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
const read = (p) => readFileSync(p, "utf8");
const operationCapabilitiesSource = read("lib/admin/package-operation-capabilities.ts");
const operationCapabilitiesModule = await import(
  `data:text/javascript,${encodeURIComponent(
    ts.transpileModule(operationCapabilitiesSource, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    }).outputText,
  )}`,
);
const { getAdminPackageOperationCapabilities } = operationCapabilitiesModule;
const fixedNow = new Date("2026-07-23T12:00:00.000Z");
const getCapabilities = (overrides = {}) =>
  getAdminPackageOperationCapabilities({
    paymentStatus: "결제완료",
    hasIssuedPass: true,
    passStatus: "active",
    expiresAt: new Date("2026-07-24T12:00:00.000Z"),
    remainingCount: 3,
    now: fixedNow,
    ...overrides,
  });
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
const capabilities = operationCapabilitiesSource;
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

assert.deepEqual(getCapabilities(), {
  canExtend: true,
  canAdjustSessions: true,
  blockReasons: [],
});

for (const scenario of [
  {
    overrides: { paymentStatus: "결제대기" },
    reason: "결제완료 상태에서만 운영 작업을 할 수 있습니다.",
  },
  {
    overrides: { hasIssuedPass: false },
    reason: "연결된 이용권이 없어 운영 작업을 할 수 없습니다.",
  },
  {
    overrides: { passStatus: null },
    reason: "이용권 상태를 확인할 수 없어 운영 작업을 할 수 없습니다.",
  },
  {
    overrides: { passStatus: "" },
    reason: "이용권 상태를 확인할 수 없어 운영 작업을 할 수 없습니다.",
  },
  {
    overrides: { passStatus: "unknown" },
    reason: "이용권 상태를 확인할 수 없어 운영 작업을 할 수 없습니다.",
  },
  ...["cancelled", "canceled", "취소"].map((passStatus) => ({
    overrides: { passStatus },
    reason: "취소된 이용권에서는 운영 작업을 할 수 없습니다.",
  })),
]) {
  const result = getCapabilities(scenario.overrides);
  assert.equal(result.canExtend, false);
  assert.equal(result.canAdjustSessions, false);
  assert.ok(result.blockReasons.includes(scenario.reason));
}

const unissued = getCapabilities({ hasIssuedPass: false });
assert.ok(unissued.blockReasons.every((reason) => !reason.includes("할 수 있습니다.")));

for (const overrides of [
  { expiresAt: fixedNow },
  { expiresAt: new Date("2026-07-23T11:59:59.999Z") },
  { remainingCount: null },
  { remainingCount: Number.NaN },
  { remainingCount: "3" },
]) {
  const result = getCapabilities(overrides);
  assert.equal(result.canExtend, true);
  assert.equal(result.canAdjustSessions, false);
}

assert.ok(
  getCapabilities({ expiresAt: fixedNow }).blockReasons.includes(
    "만료된 이용권은 연장 후 횟수를 조절할 수 있습니다.",
  ),
);
assert.ok(
  getCapabilities({ remainingCount: null }).blockReasons.includes(
    "현재 잔여 횟수를 확인할 수 없어 횟수를 조절할 수 없습니다.",
  ),
);
assert.equal(getCapabilities({ remainingCount: 0 }).canAdjustSessions, true);
