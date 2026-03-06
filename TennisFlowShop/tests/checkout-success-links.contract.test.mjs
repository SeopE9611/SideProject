import test from 'node:test';
import assert from 'node:assert/strict';

import { buildCheckoutSuccessLinks } from '../lib/checkout-success-links.js';

test('회원 소유 주문이면 게스트 주문조회 링크 대신 마이페이지 주문 링크를 사용한다', () => {
  const result = buildCheckoutSuccessLinks({
    accessSub: 'user-123',
    orderId: 'order-abc',
    stringingApplicationId: null,
  });

  assert.equal(result.isLoggedIn, true);
  assert.equal(result.orderDetailHref, '/mypage');
});

test('신청서 ID가 있고 로그인 상태면 마이페이지 신청내역 링크를 노출한다', () => {
  const result = buildCheckoutSuccessLinks({
    accessSub: 'user-123',
    orderId: 'order-abc',
    stringingApplicationId: 'apply-789',
  });

  assert.equal(result.stringingApplicationHref, '/mypage?tab=applications&applicationId=apply-789');
});

test('비로그인 상태에서는 신청서 ID가 있어도 신청내역 링크를 만들지 않는다', () => {
  const result = buildCheckoutSuccessLinks({
    accessSub: null,
    orderId: 'order-abc',
    stringingApplicationId: 'apply-789',
  });

  assert.equal(result.isLoggedIn, false);
  assert.equal(result.orderDetailHref, '/order-lookup/details/order-abc');
  assert.equal(result.stringingApplicationHref, null);
});


test('주문 success 링크 분기는 query hint와 무관하게 DB 신청서 ID로만 결정한다', () => {
  const result = buildCheckoutSuccessLinks({
    accessSub: 'user-123',
    orderId: 'order-abc',
    stringingApplicationId: null,
    queryStringingApplicationId: 'apply-from-query',
  });

  assert.equal(result.stringingApplicationHref, null);
});
