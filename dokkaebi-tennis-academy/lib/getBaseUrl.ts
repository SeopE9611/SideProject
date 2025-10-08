/**
 * 내부 API 절대 URL 생성 유틸(동기).
 * 우선순위:
 * 1) NEXT_PUBLIC_SITE_URL  ← 프로덕션/프리뷰에서 권장
 * 2) NEXT_PUBLIC_BASE_URL  ← 로컬 개발용(프로덕션에서 현재 호스트와 불일치 시 무시)
 * 3) VERCEL_URL            ← Vercel 제공(host만, https 보정)
 * 4) http://localhost:3000
 */
export function getBaseUrl() {
  // 1) 명시 사이트 URL
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (site && /^https?:\/\//i.test(site)) return site.replace(/\/+$/, '');

  // 2) BASE_URL (프로덕션 불일치 가드)
  const base = process.env.NEXT_PUBLIC_BASE_URL;
  if (base && /^https?:\/\//i.test(base)) {
    if (process.env.NODE_ENV === 'production') {
      const vercelHost = (process.env.VERCEL_URL || '').replace(/\/+$/, '');
      try {
        const baseHost = new URL(base).host;
        // 프로덕션에서 BASE_URL 호스트가 현재 Vercel 호스트와 다르면 무시
        if (vercelHost && baseHost && baseHost !== vercelHost) {
          // ignore and fall through
        } else {
          return base.replace(/\/+$/, '');
        }
      } catch {
        // URL 파싱 실패 시 폴백 계속
      }
    } else {
      // 개발환경에선 그대로 사용
      return base.replace(/\/+$/, '');
    }
  }

  // 3) Vercel 제공 host
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel.replace(/\/+$/, '')}`;

  // 4) 로컬
  return 'http://localhost:3000';
}
