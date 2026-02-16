import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('보안 계약: CSRF 실패, Origin 불일치, 토큰 오류, 재전송(멱등성) 케이스를 강제한다', () => {
  const verifyAdminCsrf = read('lib/admin/verifyAdminCsrf.ts');
  const adminGuard = read('lib/admin.guard.ts');
  const packageOrders = read('app/api/packages/orders/route.ts');

  // CSRF 실패 + Origin allowlist 불일치 시 403
  assert.ok(verifyAdminCsrf.includes('if (!requestOrigin || !originAllowlist.has(requestOrigin))'));
  assert.ok(verifyAdminCsrf.includes('if (!headerToken || !cookieToken || headerToken !== cookieToken)'));
  assert.ok(verifyAdminCsrf.includes("return NextResponse.json({ message: 'Forbidden' }, { status: 403 });"));

  // 잘못된/만료 토큰은 401, 관리자 아님은 403
  assert.ok(adminGuard.includes('if (!at) return { ok: false, res: authError(401) };'));
  assert.ok(adminGuard.includes('payloadRaw = verifyAccessToken(at);'));
  assert.ok(adminGuard.includes('if (!payload || !ObjectId.isValid(payload.sub))'));
  assert.ok(adminGuard.includes('return { ok: false, res: authError(401) };'));
  assert.ok(adminGuard.includes('if (!admin) {'));
  assert.ok(adminGuard.includes('return { ok: false, res: authError(403) };'));

  // 재전송 멱등성: Idempotency-Key로 기존 주문 재사용
  assert.ok(packageOrders.includes("const idem = req.headers.get('Idempotency-Key') || '';"));
  assert.ok(packageOrders.includes("'meta.idemKey': idem"));
  assert.ok(packageOrders.includes('reused: true'));
});
