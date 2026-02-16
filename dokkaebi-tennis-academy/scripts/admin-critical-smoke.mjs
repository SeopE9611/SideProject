const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

const cases = [
  { name: 'admin orders list requires auth', path: '/api/admin/orders', method: 'GET', expect: [401] },
  { name: 'admin points adjust requires auth/csrf', path: '/api/admin/points/adjust', method: 'POST', body: { userId: 'x', amount: 100 }, expect: [401, 403] },
  { name: 'admin settlements bulk-delete requires auth', path: '/api/admin/settlements/bulk-delete', method: 'POST', body: { yyyymms: ['202501'] }, expect: [401, 403] },
];

for (const tc of cases) {
  const res = await fetch(`${BASE_URL}${tc.path}`, {
    method: tc.method,
    headers: { 'content-type': 'application/json', origin: 'https://evil.example' },
    body: tc.body ? JSON.stringify(tc.body) : undefined,
  });

  if (!tc.expect.includes(res.status)) {
    const body = await res.text();
    throw new Error(`[admin-critical] ${tc.name}: expected ${tc.expect.join('/')} but got ${res.status} body=${body}`);
  }

  console.log(`[admin-critical] PASS ${tc.name}: ${res.status}`);
}
