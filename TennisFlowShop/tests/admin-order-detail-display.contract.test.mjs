import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));

function read(relPath) {
  return readFileSync(join(REPO_ROOT, relPath), "utf8");
}

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
