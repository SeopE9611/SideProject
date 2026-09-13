import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

import {
  normalizeRentalAmountBreakdown,
  normalizeRentalStatus,
} from "../lib/admin-ops-normalize.ts";
import {
  buildRentalPaymentFilterExpression,
  isRentalPaymentPaidForFilter,
} from "../lib/admin/rental-payment-filter.ts";
import { resolveHistoricalStringingItemPrice } from "../lib/orders/historical-order-item-price.ts";
import { getStringingPaymentMethodDisplayLabel } from "../lib/payments/stringing-payment-method-display.ts";
import { normalizeAcademyApplicationStatusForRead } from "../lib/types/academy.ts";

const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));

function read(relPath) {
  return readFileSync(join(REPO_ROOT, relPath), "utf8");
}

test("교체서비스 결제수단은 저장된 한국어 무통장입금을 그대로 인식한다", () => {
  assert.equal(getStringingPaymentMethodDisplayLabel("무통장입금"), "무통장입금");
  assert.equal(getStringingPaymentMethodDisplayLabel("bank_transfer"), "무통장입금");
  assert.equal(getStringingPaymentMethodDisplayLabel("package"), "패키지 사용");
});

test("교체서비스 과거 가격은 저장된 장착비만 확정 가격으로 사용한다", () => {
  assert.deepEqual(resolveHistoricalStringingItemPrice({ mountingFee: 15_000 }), {
    displayPrice: 15_000,
    snapshotStatus: "confirmed",
  });
  assert.deepEqual(resolveHistoricalStringingItemPrice({ mountingFee: 0 }), {
    displayPrice: null,
    snapshotStatus: "needs_review",
  });
  assert.deepEqual(resolveHistoricalStringingItemPrice({}), {
    displayPrice: null,
    snapshotStatus: "needs_review",
  });
});

test("교체서비스 상세과 목록은 현재 catalog 장착비를 과거 가격으로 재구성하지 않는다", () => {
  const detailHandler = read("app/features/stringing-applications/api/handlers.ts");
  const orderList = read("app/features/orders/api/db.ts");
  const detailClient = read(
    "app/features/stringing-applications/components/StringingApplicationDetailClient.tsx",
  );

  assert.ok(detailHandler.includes("resolveHistoricalStringingItemPrice"));
  assert.ok(detailHandler.includes("mountingFee: item.mountingFee"));
  assert.ok(detailHandler.includes("mountingFee: it.price"));
  assert.ok(orderList.includes("totalPriceSnapshotStatus"));
  assert.ok(detailClient.includes("가격 스냅샷 확인 필요"));
});

test("대여 금액은 목록과 상세이 같은 legacy fallback을 사용한다", () => {
  assert.deepEqual(
    normalizeRentalAmountBreakdown({
      fee: 10_000,
      deposit: 20_000,
      stringing: { requested: true, price: 7_000, mountingFee: 15_000 },
    }),
    { fee: 10_000, deposit: 20_000, stringPrice: 7_000, stringingFee: 15_000, total: 52_000 },
  );

  const listRoute = read("app/api/admin/rentals/route.ts");
  const detailRoute = read("app/api/admin/rentals/[id]/route.ts");
  assert.ok(listRoute.includes("normalizeRentalAmountBreakdown(rentalDoc)"));
  assert.ok(detailRoute.includes("normalizeRentalAmountBreakdown(doc)"));
  assert.ok(detailRoute.includes("if (!user && doc.guest)"));
});

test("대여 workflow와 결제 상태는 서로 다른 의미로 표시된다", () => {
  assert.equal(normalizeRentalStatus("paid"), "인도 대기");
  assert.equal(isRentalPaymentPaidForFilter({ paymentStatus: "pending", status: "out" }), false);
  assert.equal(isRentalPaymentPaidForFilter({ paymentStatus: "paid", status: "pending" }), true);
  assert.deepEqual(Object.keys(buildRentalPaymentFilterExpression("paid")), ["$let"]);
  assert.deepEqual(Object.keys(buildRentalPaymentFilterExpression("unpaid")), ["$not"]);
});

test("대여 목록은 연체 경과와 명시 결제상태 우선 필터를 사용한다", () => {
  const route = read("app/api/admin/rentals/route.ts");
  const client = read("app/admin/rentals/_components/AdminRentalsClient.tsx");
  assert.ok(route.includes('buildRentalPaymentFilterExpression("paid")'));
  assert.ok(route.includes('buildRentalPaymentFilterExpression("unpaid")'));
  assert.ok(client.includes("getRentalOverdueDays(r.status, r.dueAt)"));
  assert.ok(client.includes("1일 미만 경과"));
});

test("주문 목록과 상세은 같은 상태 정규화 정책을 사용한다", () => {
  const detailRoute = read("app/api/orders/[id]/route.ts");
  assert.ok(detailRoute.includes("status: normalizeOrderStatus(order.status)"));
});

test("패키지 횟수 불일치는 진행률 denominator로 숨기지 않고 경고한다", () => {
  const readModel = read("lib/admin/package-state-read-model.ts");
  const listRoute = read("app/api/admin/package-orders/route.ts");
  const detailRoute = read("app/api/admin/package-orders/[id]/route.ts");
  assert.ok(readModel.includes("sessionCountConsistent"));
  assert.ok(readModel.includes('"session_count_mismatch"'));
  assert.match(readModel, /\$divide:\s*\[\s*"\$usedSessions",\s*"\$totalSessions"/);
  assert.ok(listRoute.includes("customerEmail"));
  assert.ok(listRoute.includes("customerPhone"));
  assert.ok(listRoute.includes("...(searchMatch ? [{ $match: searchMatch }] : [])"));
  assert.ok(detailRoute.includes("sessionCountConsistent: 1"));
});

test("아카데미 누락 상태는 목록·상세·집계에서 submitted로 일치한다", () => {
  assert.equal(normalizeAcademyApplicationStatusForRead(undefined), "submitted");
  assert.equal(normalizeAcademyApplicationStatusForRead(""), "submitted");
  assert.equal(normalizeAcademyApplicationStatusForRead(" reviewing "), "reviewing");

  const listRoute = read("app/api/admin/academy/applications/route.ts");
  const detailRoute = read("app/api/admin/academy/applications/[id]/route.ts");
  assert.ok(listRoute.includes('{ status: "submitted" }'));
  assert.ok(listRoute.includes("{ status: null }"));
  assert.ok(listRoute.includes('{ $type: "$status" }'));
  assert.match(
    listRoute,
    /counts\.all \+= row\.count;[\s\S]*normalizeAcademyApplicationStatusForRead/,
  );
  assert.ok(detailRoute.includes("normalizeAcademyApplicationStatusForRead(doc.status)"));
});
