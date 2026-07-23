import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("../app/services/packages/success/page.tsx", import.meta.url),
  "utf8",
);

function indexOfOrFail(fragment) {
  const index = source.indexOf(fragment);
  assert.notEqual(index, -1, `필수 코드가 없습니다: ${fragment}`);
  return index;
}

test("패키지 성공 페이지는 DB 조회 전에 access token과 refresh token으로 뷰어를 확인한다", () => {
  assert.match(
    source,
    /function resolvePackageSuccessViewer\s*\([\s\S]*accessToken[\s\S]*refreshToken/,
  );
  assert.match(source, /verifyAccessToken\(accessToken\)/);
  assert.match(source, /jwt\.verify\(refreshToken, process\.env\.REFRESH_TOKEN_SECRET!/);
  assert.match(source, /viewerUserId\s*!==\s*viewerUserId\.trim\(\)/);
  assert.match(source, /ObjectId\.isValid\(viewerUserId\)/);
  assert.match(source, /<LoginGate next=\{next\} variant="checkout"\s*\/>/);
  assert.match(source, /qs\.set\("packageOrderId", packageOrderId\)/);
  assert.ok(
    indexOfOrFail("const viewerPayload = resolvePackageSuccessViewer") <
      indexOfOrFail('.collection("packageOrders").findOne(packageOrderFilter)'),
  );
});

test("일반 회원은 소유권을 포함해 조회하고 관리자는 주문 ID로 조회한다", () => {
  assert.match(
    source,
    /const packageOrderFilter(?:\s*:\s*Filter<Document>)?\s*=\s*isAdmin\s*\?\s*\{\s*_id: packageOrderObjectId\s*\}\s*:\s*\{\s*_id: packageOrderObjectId,\s*userId: viewerObjectId\s*\}/,
  );
  assert.match(source, /const viewerObjectId = new ObjectId\(viewerUserId\)/);
  assert.match(source, /findOne\(packageOrderFilter\)/);
  assert.doesNotMatch(
    source,
    /findOne\s*\(\s*\{\s*_id\s*:\s*new ObjectId\(packageOrderId\)\s*\}\s*\)/,
  );
});

test("주문 없음과 권한 없는 주문은 동일하게 notFound 처리한다", () => {
  assert.match(source, /if \(!packageOrder\) return notFound\(\)/);
  assert.doesNotMatch(source, /소유자가 아닙니다|다른 사용자의 주문입니다|403/);
});

test("패키지 성공 페이지는 비회원 ID 조회 및 package lookup fallback을 사용하지 않는다", () => {
  assert.doesNotMatch(source, /allowGuestCheckout|GUEST_ORDER_MODE|NEXT_PUBLIC_GUEST_ORDER_MODE/);
  assert.doesNotMatch(source, /package-lookup\/details\//);
  assert.match(source, /const lookupHref = "\/mypage\?tab=passes"/);
});

test("기존 패키지 성공 화면과 결제 표시 기능을 유지한다", () => {
  assert.match(source, /export default async function PackageSuccessPage/);
  assert.match(source, /LoginGate/);
  assert.match(source, /DevMarkPaidButton/);
  assert.match(source, /getPaymentDisplaySummary/);
  assert.match(source, /UnifiedPackageCard/);
  assert.match(source, /packageOrderId/);
  assert.match(source, /normalizedPaymentProvider === "nicepay"/);
  assert.match(source, /normalizedPaymentProvider === "tosspayments"/);
  assert.match(source, /패키지권 확인/);
  assert.match(source, /신청자 정보/);
});
