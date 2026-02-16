import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('관리자 포인트 조정 라우트는 guard.admin._id를 ref.adminId(ObjectId)로 고정 전달한다', () => {
  const route = read('app/api/admin/points/adjust/route.ts');

  // 관리자 식별자는 requireAdmin 계약(guard.admin._id)만 사용해야 한다.
  assert.ok(route.includes('const adminRef: AdminRef = { adminId: guard.admin._id };'));
  assert.ok(route.includes('ref: adminRef,'));

  // 기존 취약 패턴(guard as any + user 경유)이 재유입되지 않도록 계약으로 고정.
  assert.equal(route.includes('(guard as any)?.user?.id'), false);
  assert.equal(route.includes('guard.user'), false);
});

test('관리자 포인트 이력 응답은 adminId 누락 없이 직렬화 계약을 가진다', () => {
  const adminHistoryRoute = read('app/api/admin/users/[id]/points/history/route.ts');
  const pointsType = read('lib/types/points.ts');

  // API mapper가 ref.adminId를 응답 필드(adminId)로 노출해야 한다.
  assert.ok(adminHistoryRoute.includes('adminId: d?.ref?.adminId ? String(d.ref.adminId) : null,'));

  // 타입 계약도 동일하게 adminId(nullable string)를 보장해야 한다.
  assert.ok(pointsType.includes('adminId: string | null;'));
});
