import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('주문 목록 API는 신청서를 최신순으로 조회하고 첫 원소를 대표 ID로 사용한다', () => {
  const route = read('app/api/users/me/orders/route.ts');

  assert.ok(route.includes('.sort({ updatedAt: -1, createdAt: -1 })'));
  assert.ok(route.includes('const submittedApplicationId = prev.submittedApplicationId === null ? String(app._id) : prev.submittedApplicationId;'));

  const appsSortedNewestFirst = [
    { _id: 'latest-app', orderId: 'order-1', stringDetails: { lines: [{}, {}] } },
    { _id: 'older-app', orderId: 'order-1', stringDetails: { lines: [{}] } },
  ];

  const stringServiceByOrderId = new Map();
  for (const app of appsSortedNewestFirst) {
    const orderId = String(app.orderId);
    const prev = stringServiceByOrderId.get(orderId) ?? { submittedApplicationId: null, usedSlots: 0 };
    const usedLineCount = app?.stringDetails?.lines?.length ?? 0;
    const submittedApplicationId = prev.submittedApplicationId === null ? String(app._id) : prev.submittedApplicationId;

    stringServiceByOrderId.set(orderId, {
      submittedApplicationId,
      usedSlots: prev.usedSlots + usedLineCount,
    });
  }

  assert.equal(stringServiceByOrderId.get('order-1').submittedApplicationId, 'latest-app');
});


test('주문 상세 API도 대표/요약 신청서를 동일 최신순으로 정렬한다', () => {
  const route = read('app/api/orders/[id]/route.ts');

  assert.ok(route.includes('.sort({ updatedAt: -1, createdAt: -1 })'));
  assert.ok(route.includes('const [linkedApp] = await db'));
});

test('마이페이지 CTA는 API가 준 대표 신청서 ID(stringingApplicationId)로 신청서 보기 링크를 만든다', () => {
  const orderList = read('app/mypage/tabs/OrderList.tsx');

  assert.ok(orderList.includes("`/mypage?tab=orders&flowType=application&flowId=${order.stringingApplicationId}&from=orders`"));
});
