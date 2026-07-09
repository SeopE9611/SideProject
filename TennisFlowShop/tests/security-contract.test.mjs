import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("보안 계약: CSRF 실패, Origin 불일치, 토큰 오류, 재전송(멱등성) 케이스를 강제한다", () => {
  const verifyAdminCsrf = read("lib/admin/verifyAdminCsrf.ts");
  const adminGuard = read("lib/admin.guard.ts");
  const packageOrders = read("app/api/packages/orders/route.ts");

  // 단일 표준 키 계약: 서버/클라이언트 모두 공통 상수를 사용한다.
  const adminFetcher = read("lib/admin/adminFetcher.ts");
  const adminCsrf = read("lib/admin/adminCsrf.ts");
  assert.ok(adminCsrf.includes("export const ADMIN_CSRF_COOKIE_KEY = 'adminCsrfToken';"));
  assert.ok(adminCsrf.includes("export const ADMIN_CSRF_HEADER_KEY = 'x-admin-csrf-token';"));
  assert.ok(verifyAdminCsrf.includes("ADMIN_CSRF_COOKIE_KEY"));
  assert.ok(verifyAdminCsrf.includes("ADMIN_CSRF_HEADER_KEY"));
  assert.ok(adminFetcher.includes("ADMIN_CSRF_COOKIE_KEY"));
  assert.ok(adminFetcher.includes("ADMIN_CSRF_HEADER_KEY"));
  // CSRF 실패 + Origin allowlist 불일치 시 403
  assert.ok(verifyAdminCsrf.includes("if (!requestOrigin || !originAllowlist.has(requestOrigin))"));
  assert.ok(verifyAdminCsrf.includes("if (!headerToken || !cookieToken)"));
  assert.ok(verifyAdminCsrf.includes("if (headerToken !== cookieToken)"));
  assert.ok(verifyAdminCsrf.includes("return { ok: true };"));
  assert.ok(
    verifyAdminCsrf.includes(
      "return NextResponse.json({ message: 'Forbidden' }, { status: 403 });",
    ),
  );

  // 잘못된/만료 토큰은 401, 관리자 아님은 403
  assert.ok(adminGuard.includes("if (!at) return { ok: false, res: authError(401) };"));
  assert.ok(adminGuard.includes("payloadRaw = verifyAccessToken(at);"));
  assert.ok(adminGuard.includes("if (!payload || !ObjectId.isValid(payload.sub))"));
  assert.ok(adminGuard.includes("return { ok: false, res: authError(401) };"));
  assert.ok(adminGuard.includes("if (!admin) {"));
  assert.ok(adminGuard.includes("return { ok: false, res: authError(403) };"));

  // 재전송 멱등성: Idempotency-Key로 기존 주문 재사용
  assert.ok(packageOrders.includes("const idem = req.headers.get('Idempotency-Key') || '';"));
  assert.ok(packageOrders.includes("'meta.idemKey': idem"));
  assert.ok(packageOrders.includes("reused: true"));
});

test("관리자 결제 동기화/정산 변경 API는 표준 CSRF 검증을 사용한다", () => {
  const adminNiceOrderSync = read("app/api/admin/payments/nice/sync/[orderId]/route.ts");
  const niceOrderSync = read("app/api/payments/nice/sync/[orderId]/route.ts");
  const niceRentalSync = read("app/api/payments/nice/rental/sync/[rentalId]/route.ts");
  const nicePackageSync = read("app/api/payments/nice/package/sync/[packageOrderId]/route.ts");
  const settlementMonth = read("app/api/settlements/[yyyymm]/route.ts");
  const settlementBulkDelete = read("app/api/settlements/bulk-delete/route.ts");
  const nicePrepare = read("app/api/payments/nice/prepare/route.ts");
  const niceReturn = read("app/api/payments/nice/return/route.ts");
  const niceRentalPrepare = read("app/api/payments/nice/rental/prepare/route.ts");
  const niceRentalReturn = read("app/api/payments/nice/rental/return/route.ts");
  const nicePackagePrepare = read("app/api/payments/nice/package/prepare/route.ts");
  const nicePackageReturn = read("app/api/payments/nice/package/return/route.ts");

  for (const [label, src] of [
    ["admin nice order sync", adminNiceOrderSync],
    ["nice order sync", niceOrderSync],
    ["nice rental sync", niceRentalSync],
    ["nice package sync", nicePackageSync],
    ["settlement month", settlementMonth],
    ["settlement bulk delete", settlementBulkDelete],
  ]) {
    assert.ok(src.includes("requireAdmin("), `${label}: 관리자 표준 인증을 사용해야 합니다.`);
    assert.ok(src.includes("verifyAdminCsrf("), `${label}: 관리자 CSRF 검증을 사용해야 합니다.`);
  }

  assert.ok(!settlementMonth.includes(".startsWith(allow)"));
  assert.ok(!settlementBulkDelete.includes(".startsWith(allow)"));

  for (const [label, src] of [
    ["nice prepare", nicePrepare],
    ["nice return", niceReturn],
    ["nice rental prepare", niceRentalPrepare],
    ["nice rental return", niceRentalReturn],
    ["nice package prepare", nicePackagePrepare],
    ["nice package return", nicePackageReturn],
  ]) {
    assert.ok(!src.includes("verifyAdminCsrf("), `${label}: 고객/PG 플로우에 관리자 CSRF를 요구하면 안 됩니다.`);
  }
});
