/**
 * 서버/RSC에서 내부 API 호출 시 절대 URL을 안정적으로 생성하기 위한 유틸.
 * 우선순위:
 * 1) NEXT_PUBLIC_SITE_URL (프로덕션/프리뷰에서 명시 지정)
 * 2) NEXT_PUBLIC_BASE_URL (현재 .env.local에 존재)
 * 3) VERCEL_URL (Vercel 환경 자동 제공, 도메인만 제공되므로 https 보정)
 * 4) 로컬 기본값 (http://localhost:3000)
 */
export function getBaseUrl() {
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (site && /^https?:\/\//i.test(site)) return site.replace(/\/+$/, '');

  const base = process.env.NEXT_PUBLIC_BASE_URL;
  if (base && /^https?:\/\//i.test(base)) return base.replace(/\/+$/, '');

  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel.replace(/\/+$/, '')}`;

  return 'http://localhost:3000';
}
