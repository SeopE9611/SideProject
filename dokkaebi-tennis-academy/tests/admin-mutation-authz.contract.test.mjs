import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const API_ROOT = new URL('../app/api', import.meta.url).pathname;

function walk(dir) {
  const entries = readdirSync(dir);
  const out = [];
  for (const entry of entries) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walk(full));
    if (st.isFile() && entry === 'route.ts') out.push(full);
  }
  return out;
}

function read(path) {
  return readFileSync(path, 'utf8');
}

function hasMutationMethod(routeSource) {
  return /export\s+(async\s+function\s+(POST|PATCH|PUT|DELETE)|\{\s*(POST|PATCH|PUT|DELETE)\s*\})/.test(routeSource);
}

function needsCsrf(routeSource) {
  return /export\s+async\s+function\s+(POST|PATCH|PUT|DELETE)\s*\(/.test(routeSource);
}

test('관리자 변경성 API는 비로그인/일반유저/admin 권한 계약(401/403/200)을 강제한다', () => {
  const files = walk(API_ROOT)
    .filter((f) => f.includes('/admin/'))
    .map((f) => ({ fullPath: f, relPath: relative(new URL('..', import.meta.url).pathname, f), src: read(f) }))
    .filter(({ src }) => hasMutationMethod(src));

  assert.ok(files.length > 0, '관리자 변경성 API 라우트가 발견되어야 합니다.');

  for (const route of files) {
    const pathForMsg = route.relPath;
    const isDelegatingRoute = route.src.includes("export { POST }") || route.src.includes("export { PATCH }") || route.src.includes("export { PUT }") || route.src.includes("export { DELETE }");

    const hasExplicitAdminRoleGuard = route.src.includes("if (me.role !== 'admin')") || route.src.includes('if (user.role !== \'admin\')');

    assert.ok(
      route.src.includes('requireAdmin(') || route.src.includes('proxyToLegacyAdminRoute(') || isDelegatingRoute || hasExplicitAdminRoleGuard,
      `${pathForMsg}: 관리자 변경 API는 requireAdmin/proxyToLegacyAdminRoute 또는 명시적 admin role guard를 통해 401/403 계약을 따라야 합니다.`,
    );

    if (route.src.includes('requireAdmin(')) {
      assert.ok(route.src.includes('if (!guard.ok) return guard.res;') || route.src.includes('if (!g.ok) return g.res;'), `${pathForMsg}: requireAdmin 실패 시 guard.res를 즉시 반환해야 합니다.`);
    }

    if (needsCsrf(route.src) && !isDelegatingRoute && !hasExplicitAdminRoleGuard) {
      assert.ok(
        route.src.includes('verifyAdminCsrf(') || route.src.includes('proxyToLegacyAdminRoute(') || route.src.includes("req.headers.get('origin')"),
        `${pathForMsg}: 변경성 메서드는 CSRF/Origin 보호를 포함해야 합니다.`,
      );
    }

    if (!isDelegatingRoute) {
      assert.ok(
        route.src.includes('return NextResponse.json(') || route.src.includes('return new NextResponse(') || route.src.includes('proxyToLegacyAdminRoute('),
        `${pathForMsg}: 관리자 성공 응답(200 계열) 경로가 있어야 합니다.`,
      );
    }
  }
});
