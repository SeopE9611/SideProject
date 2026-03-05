import test from 'node:test';
import assert from 'node:assert/strict';
import { hasCompletedStringingApplication, normalizeStringingApplicationId } from '../app/order-lookup/_lib/stringing-status.js';

test('normalizeStringingApplicationId trims and null-guards value', () => {
  assert.equal(normalizeStringingApplicationId('  app-123  '), 'app-123');
  assert.equal(normalizeStringingApplicationId('   '), null);
  assert.equal(normalizeStringingApplicationId(undefined), null);
});

test('hasCompletedStringingApplication returns true when server boolean is true', () => {
  assert.equal(hasCompletedStringingApplication({ isStringServiceApplied: true, stringingApplicationId: null }), true);
});

test('hasCompletedStringingApplication returns true when boolean is false but stringingApplicationId exists (CTA should not show 신청하기)', () => {
  assert.equal(hasCompletedStringingApplication({ isStringServiceApplied: false, stringingApplicationId: 'app-456' }), true);
});

test('hasCompletedStringingApplication returns false when boolean is false and id is missing', () => {
  assert.equal(hasCompletedStringingApplication({ isStringServiceApplied: false, stringingApplicationId: null }), false);
});
