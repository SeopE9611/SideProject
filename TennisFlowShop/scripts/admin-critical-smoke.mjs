const baseUrl = process.env.BASE_URL;

if (!baseUrl) {
  console.error('[admin-critical] BASE_URL 환경변수가 설정되지 않았습니다.');
  console.error('[admin-critical] 예시) BASE_URL=http://localhost:3000 node scripts/admin-critical-smoke.mjs');
  console.error('[admin-critical] 서버를 먼저 기동한 뒤 다시 실행하세요.');
  process.exit(1);
}

const cases = [
  { name: 'admin orders list requires auth', path: '/api/admin/orders', method: 'GET', expect: [401] },
  { name: 'admin points adjust requires auth/csrf', path: '/api/admin/points/adjust', method: 'POST', body: { userId: 'x', amount: 100 }, expect: [401, 403] },
  { name: 'admin settlements bulk-delete requires auth', path: '/api/admin/settlements/bulk-delete', method: 'POST', body: { yyyymms: ['202501'] }, expect: [401, 403] },
];

for (const tc of cases) {
  let res;
  try {
    res = await fetch(`${baseUrl}${tc.path}`, {
      method: tc.method,
      headers: { 'content-type': 'application/json', origin: 'https://evil.example' },
      body: tc.body ? JSON.stringify(tc.body) : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`[admin-critical] ${tc.name}: 요청 실패 (${message}). 서버가 기동 중인지 확인하세요. BASE_URL=${baseUrl}`);
  }

  if (!tc.expect.includes(res.status)) {
    const body = await res.text();
    throw new Error(`[admin-critical] ${tc.name}: expected ${tc.expect.join('/')} but got ${res.status} body=${body}`);
  }

  console.log(`[admin-critical] PASS ${tc.name}: ${res.status}`);
}
