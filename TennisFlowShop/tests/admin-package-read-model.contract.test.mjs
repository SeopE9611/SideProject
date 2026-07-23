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
