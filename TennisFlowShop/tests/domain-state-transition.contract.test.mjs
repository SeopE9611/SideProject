import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('주문/대여/정산/포인트 주요 상태전이 성공·실패 시나리오 계약을 유지한다', () => {
  const orderConfirm = read('app/api/orders/[id]/confirm/route.ts');
  const rentalPay = read('app/api/rentals/[id]/pay/route.ts');
  const settlementBulkDelete = read('app/api/settlements/bulk-delete/route.ts');
  const pointsAdjust = read('app/api/admin/points/adjust/route.ts');

  // 주문 구매확정: 배송완료에서만 성공, 이미 확정이면 멱등 허용
  assert.ok(orderConfirm.includes("const allowedPrev = prevStatus === '배송완료' || prevStatus === 'delivered';"));
  assert.ok(orderConfirm.includes('if (!alreadyConfirmed && !allowedPrev)'));
  assert.ok(orderConfirm.includes("status: 400"));

  // 대여 결제: pending -> paid 전이만 허용, 이미 paid는 멱등 성공
  assert.ok(rentalPay.includes("if ((order.status ?? 'pending') === 'paid')"));
  assert.ok(rentalPay.includes("return NextResponse.json({ ok: true, id: rentalId });"));
  assert.ok(rentalPay.includes("updateOne(\n      { _id, status: 'pending' }"));
  assert.ok(rentalPay.includes("return NextResponse.json({ ok: false, code: 'INVALID_STATE'"));

  // 정산 일괄 삭제: 동시 실행 락으로 중복 실행 실패(409)
  assert.ok(settlementBulkDelete.includes('acquireAdminExecutionLock'));
  assert.ok(settlementBulkDelete.includes("status: 409"));

  // 포인트 조정: 지급/차감 분기와 실패 코드 계약 유지
  assert.ok(pointsAdjust.includes('if (amount > 0)'));
  assert.ok(pointsAdjust.includes('await deductPoints('));
  assert.ok(pointsAdjust.includes("if (code === 'INSUFFICIENT_POINTS')"));
});
