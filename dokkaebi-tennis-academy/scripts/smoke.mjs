// CI Smoke Test
// - 목적: "빌드는 되는데 런타임에서 죽는" 상황을 최소 비용으로 조기 탐지
// - 원칙: DB/외부 서비스에 의존하지 않는 경로만 점검
// - Node 22+ 환경에서는 fetch가 기본 제공됩니다.
import { execSync } from 'node:child_process';

const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:3000';

async function check(path, okStatuses = [200]) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, { redirect: 'manual' });
  const status = res.status;

  if (!okStatuses.includes(status)) {
    const text = await res.text().catch(() => '');
    throw new Error(`[SMOKE FAIL] ${path} -> ${status} (expected ${okStatuses.join(', ')})\n` + text.slice(0, 200));
  }
  console.log(`[SMOKE OK] ${path} -> ${status}`);
}



async function checkAuthGate(path) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, { redirect: 'manual' });
  const status = res.status;
  const location = res.headers.get('location') || '';
  const text = await res.text().catch(() => '');
  const pass = [302, 307, 308].includes(status) || (status === 200 && (location.includes('/login') || text.includes('로그인') || text.toLowerCase().includes('login')));
  if (!pass) {
    throw new Error(`[SMOKE FAIL][AUTH_GATE] ${path} -> ${status}, location=${location}\n` + text.slice(0, 200));
  }
  console.log(`[SMOKE OK][AUTH_GATE] ${path} -> ${status}${location ? `, location=${location}` : ''}`);
}

async function main() {
  // 1) 홈: 기본 렌더/정적 리소스/라우팅 깨짐을 가장 먼저 탐지
  await check('/', [200]);

  // 2) 공개 페이지: 인증/DB 없이도 렌더 가능한 라우트만 선택
  await check('/services', [200]);
  await check('/products', [200]);
  await check('/rackets', [200]);
  await check('/board', [200]);
  await check('/reviews', [200]);
  await check('/support', [200]);
  await check('/privacy', [200]);
  await check('/terms', [200]);
  await check('/login', [200]);

  // 2-1) 인증 가드 기본 동작(비로그인 기준)
  await checkAuthGate('/messages/write');

  // 3) prod 모드(next start)에서는 debug endpoint가 "존재 자체를 숨김" → 404가 정상
  await check('/api/debug/sendgrid-test', [404]);
  await check('/api/debug/sms-test?text=test', [404]);

  // 4) 타입 부채 지표(any 개수) 리포트
  const typeDebtReport = execSync('node scripts/report-admin-any-count.mjs', { encoding: 'utf8' }).trim();
  console.log(`[TYPE_DEBT] ${typeDebtReport}`);

  console.log('Smoke test passed');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
