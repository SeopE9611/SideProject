import test from 'node:test';
import assert from 'node:assert/strict';
import {
  collectionMethodLabel,
  normalizeOrderShippingMethod,
  orderShippingMethodLabel,
  getStringingAddressReadLabels,
  getOrderShippingReadLabels,
  withAddressValue,
  withPostalValue,
  collectionVisitNotice,
} from '../app/features/stringing-applications/lib/fulfillment-labels';

test('collectionMethodLabel 매핑', () => {
  assert.equal(collectionMethodLabel('visit'), '매장 방문 접수');
  assert.equal(collectionMethodLabel('self_ship'), '자가 발송(택배)');
  assert.equal(collectionMethodLabel('courier_pickup'), '기사 방문 수거');
});

test('normalizeOrderShippingMethod normalize 규칙', () => {
  assert.equal(normalizeOrderShippingMethod('방문수령'), 'visit');
  assert.equal(normalizeOrderShippingMethod('pickup'), 'visit');
  assert.equal(normalizeOrderShippingMethod('퀵배송'), 'quick');
  assert.equal(normalizeOrderShippingMethod('택배수령'), 'delivery');
  assert.equal(normalizeOrderShippingMethod('unknown-value'), 'delivery');
});

test('orderShippingMethodLabel 라벨 반환', () => {
  assert.equal(orderShippingMethodLabel('visit'), '매장 방문 수령');
  assert.equal(orderShippingMethodLabel('quick'), '퀵배송');
  assert.equal(orderShippingMethodLabel('delivery'), '택배');
});

test('getStringingAddressReadLabels visit/self_ship 구분', () => {
  const visit = getStringingAddressReadLabels('visit');
  assert.equal(visit.sectionTitle, '방문 접수 정보');
  assert.equal(visit.primaryLabel, '접수 방식');
  assert.equal(visit.secondaryLabel, '안내');

  const selfShip = getStringingAddressReadLabels('self_ship');
  assert.equal(selfShip.sectionTitle, '배송지 정보');
  assert.equal(selfShip.primaryLabel, '주소');
  assert.equal(selfShip.secondaryLabel, '우편번호');
});

test('getOrderShippingReadLabels visit/delivery 구분', () => {
  const visit = getOrderShippingReadLabels('visit');
  assert.equal(visit.sectionTitle, '수령 정보');
  assert.equal(visit.primaryLabel, '수령 방식');

  const delivery = getOrderShippingReadLabels('delivery');
  assert.equal(delivery.sectionTitle, '배송지 정보');
  assert.equal(delivery.primaryLabel, '배송지');
});

test('withAddressValue/withPostalValue visit 안내 및 기본값 처리', () => {
  assert.equal(withAddressValue('visit', '서울시 강남구'), '매장 방문 접수 (주소 입력 불필요)');
  assert.equal(withPostalValue('visit', '12345'), collectionVisitNotice);

  assert.equal(withAddressValue('self_ship', '서울시 강남구'), '서울시 강남구');
  assert.equal(withAddressValue('self_ship', '   '), '-');
  assert.equal(withPostalValue('self_ship', '12345'), '12345');
  assert.equal(withPostalValue('self_ship', ''), '-');
});
