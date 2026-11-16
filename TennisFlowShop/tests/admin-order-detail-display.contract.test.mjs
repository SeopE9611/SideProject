import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { resolveHistoricalOrderItemPrice } from "../lib/orders/historical-order-item-price.ts";
import { resolveOrderItemIsMountableString } from "../lib/orders/string-mounting-policy.ts";
import { resolveOrderStringingDisplay } from "../lib/admin/order-stringing-display.ts";

const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));

function read(relPath) {
  return readFileSync(join(REPO_ROOT, relPath), "utf8");
}

test("연결 신청서 생성 이력 없음과 draft 접수 대기를 구분한다", () => {
  assert.equal(resolveOrderStringingDisplay({ applications: [] }).kind, "none");
  const id = "507f1f77bcf86cd799439011";
  const display = resolveOrderStringingDisplay({ applications: [{ id, status: "draft" }] });
  assert.equal(display.kind, "pending");
  assert.equal(display.applicationId, id);
  assert.match(display.label, /작성 중/);
});

test("취소 이력은 미접수로 취급하지 않고 연결 문서 ID를 유지한다", () => {
  const id = "507f1f77bcf86cd799439012";
  const display = resolveOrderStringingDisplay({ applications: [{ id, status: "취소", cancelRequestStatus: "approved" }] });
  assert.equal(display.kind, "canceled");
  assert.equal(display.applicationId, id);
  assert.equal(display.status, "취소");
  assert.doesNotMatch(display.label, /미접수/);
});

test("활성 신청서가 있으면 더 최근의 취소 이력보다 우선 표시한다", () => {
  const id = "507f1f77bcf86cd799439013";
  const applications = [{ id: "507f1f77bcf86cd799439014", status: "취소" }, { id, status: "작업 중" }];
  const display = resolveOrderStringingDisplay({ applications, activeApplicationId: id });
  assert.equal(display.kind, "active");
  assert.equal(display.applicationId, id);
  assert.equal(resolveOrderStringingDisplay({ applications: [{ id, status: "검토 중" }], activeApplicationId: id }).kind, "pending");
});

test("연결 문서 누락과 취소 승인·작업 상태 불일치를 확인 필요로 표시한다", () => {
  const id = "507f1f77bcf86cd799439015";
  assert.equal(resolveOrderStringingDisplay({ applications: [], storedApplicationId: id }).kind, "error");
  assert.equal(resolveOrderStringingDisplay({ applications: [{ id, status: "작업 중", cancelRequestStatus: "approved" }] }).kind, "error");
  const broken = resolveOrderStringingDisplay({ applications: [{ id: "invalid", status: "취소" }] });
  assert.equal(broken.kind, "error");
  assert.equal(broken.applicationId, null);
});

test("주문 상세 상태 선택은 상품준비중과 현재 이후 단계만 제공한다", () => {
  const statusSelect = read("app/features/orders/components/OrderStatusSelect.tsx");
  const route = read("app/api/orders/[id]/route.ts");

  assert.ok(statusSelect.includes('"상품준비중"'));
  assert.ok(statusSelect.includes("ORDER_PROGRESS_STATUSES.slice(currentProgressIndex)"));
  assert.ok(statusSelect.includes("readOnly ? ("));
  assert.match(route, /ALLOWED_STATUS[\s\S]*"상품준비중"/);
});

test("주문 상세은 저장된 금액 구성과 상품 이미지를 표시한다", () => {
  const detail = read("app/features/orders/components/OrderDetailClient.tsx");
  const route = read("app/api/orders/[id]/route.ts");

  for (const label of ["상품 금액", "교체서비스", "배송비", "포인트 사용", "최종 결제"]) {
    assert.ok(detail.includes(label), `${label}: 금액 구성에 포함되어야 합니다.`);
  }
  assert.ok(detail.includes("hasPaymentAmountMismatch"));
  assert.ok(detail.includes('readOnly ? "취소/환불 정책" : "운영 액션"'));
  assert.ok(detail.includes("현재 주문 상태와 취소 관련 정보를 조회합니다."));
  assert.ok(detail.includes("<Image"));
  assert.ok(detail.includes('aria-label="상품 이미지 없음"'));
  assert.ok(
    route.includes("mountingFee: toFiniteNonNegativeNumber((item as any)?.mountingFee) ?? 0"),
  );
  assert.ok(!route.includes("mountingFee: isMountableString ? rawMountingFee : 0"));
});

test("주문 상세은 방문 수령 문맥과 표시 형식을 일관되게 적용한다", () => {
  const detail = read("app/features/orders/components/OrderDetailClient.tsx");
  const dialog = read("app/features/orders/components/AdminCancelOrderDialog.tsx");

  assert.ok(detail.includes("shippingMethod: shippingMethodValue"));
  assert.ok(detail.includes("getOrderStatusLabelForDisplay("));
  assert.ok(detail.includes("formatKoreanPhone(orderDetail.customer.phone)"));
  assert.ok(detail.includes("주문일시 ${formatDateTime(orderDetail.date)}"));
  assert.ok(detail.includes("hasGenericRacketLabel"));
  assert.ok(detail.includes("저장된 라켓명이 구체적이지 않거나 스트링명과 동일합니다."));
  assert.ok(dialog.includes("<DialogDescription>"));
});

test("연결 신청서는 레거시 0원 주문 상품과 부모 주문 결제 문맥을 명확히 표시한다", () => {
  const handler = read("app/features/stringing-applications/api/handlers.ts");
  const detail = read(
    "app/features/stringing-applications/components/StringingApplicationDetailClient.tsx",
  );

  assert.ok(handler.includes("resolveHistoricalOrderItemPrice"));
  assert.ok(detail.includes("가격 스냅샷 확인 필요"));
  assert.ok(detail.includes("교체서비스 금액 (주문 포함)"));
  assert.ok(detail.includes("부모 주문에서 확인"));
});

test("주문 상품의 명시적 장착 불가 snapshot은 현재 상품 장착비보다 우선한다", () => {
  const route = read("app/api/orders/[id]/route.ts");

  assert.ok(route.includes("resolveOrderItemIsMountableString(item, rawMountingFee)"));
  assert.equal(
    resolveOrderItemIsMountableString({ isMountableString: false }, 15_000),
    false,
  );
});

test("장착 가능 여부는 historical 장착비 다음에만 현재 상품값을 fallback한다", () => {
  assert.equal(resolveOrderItemIsMountableString({ mountingFee: 15_000 }, undefined), true);
  assert.equal(
    resolveOrderItemIsMountableString(
      { isMountableString: false, mountingFee: 15_000 },
      undefined,
    ),
    false,
  );
  assert.equal(resolveOrderItemIsMountableString({}, 15_000), true);
});

test("상품 snapshot fallback만 historical 장착 정책을 사용한다", () => {
  const route = read("app/api/orders/[id]/route.ts");

  assert.match(
    route,
    /isMountableString:\s*kind === "product"\s*\? resolveOrderItemIsMountableString\(item, undefined\)\s*:\s*false/,
  );
});

test("연결 신청서의 모호한 legacy 0원은 현재 상품가로 확정하지 않는다", () => {
  const currentCatalogPrice = 22_000;
  const result = resolveHistoricalOrderItemPrice({ price: 0 });

  assert.equal(result.displayPrice, null);
  assert.notEqual(result.displayPrice, currentCatalogPrice);
  assert.equal(result.snapshotStatus, "needs_review");
});

test("명시적 무료 또는 100% 할인 snapshot은 0원을 유지한다", () => {
  assert.deepEqual(
    resolveHistoricalOrderItemPrice({ price: 0, salePrice: 0 }),
    {
      displayPrice: 0,
      regularPrice: null,
      salePrice: null,
      discountAmount: null,
      discountRate: null,
      snapshotStatus: "confirmed",
    },
  );
  assert.equal(
    resolveHistoricalOrderItemPrice({ price: 0, regularPrice: 20_000, discountRate: 100 })
      .displayPrice,
    0,
  );
});
