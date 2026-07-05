/**
 * 내부 API 절대 URL 생성 유틸(동기).
 * 우선순위:
 * 1) NEXT_PUBLIC_APP_URL   ← 기존 결제/리다이렉트 호환용
 * 2) NEXT_PUBLIC_SITE_URL  ← 프로덕션/프리뷰에서 권장
 * 3) NEXT_PUBLIC_BASE_URL  ← 로컬 개발용(프로덕션에서 현재 호스트와 불일치 시 무시)
 * 4) VERCEL_URL            ← Vercel 제공(host만, https 보정)
 * 5) http://localhost:3000 (비프로덕션에서만)
 */
function normalizePublicUrl(value: string | undefined) {
  const normalized = String(value || "")
    .trim()
    .replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(normalized)) return "";

  if (process.env.NODE_ENV === "production") {
    const host = new URL(normalized).hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0") {
      throw new Error("Public base URL cannot be localhost in production");
    }
  }

  return normalized;
}

export function getBaseUrl() {
  // 1) 기존 결제/리다이렉트 호환 URL
  const app = normalizePublicUrl(process.env.NEXT_PUBLIC_APP_URL);
  if (app) return app;

  // 2) 명시 사이트 URL
  const site = normalizePublicUrl(process.env.NEXT_PUBLIC_SITE_URL);
  if (site) return site;

  // 3) BASE_URL (프로덕션 불일치 가드)
  const base = normalizePublicUrl(process.env.NEXT_PUBLIC_BASE_URL);
  if (base) {
    if (process.env.NODE_ENV === "production") {
      const vercelHost = (process.env.VERCEL_URL || "").replace(/\/+$/, "");
      try {
        const baseHost = new URL(base).host;
        // 프로덕션에서 BASE_URL 호스트가 현재 Vercel 호스트와 다르면 무시
        if (vercelHost && baseHost && baseHost !== vercelHost) {
          // ignore and fall through
        } else {
          return base;
        }
      } catch {
        // URL 파싱 실패 시 폴백 계속
      }
    } else {
      // 개발환경에선 그대로 사용
      return base;
    }
  }

  // 4) Vercel 제공 host
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel.replace(/\/+$/, "")}`;

  // 5) 로컬: 운영 환경에서는 메일/리다이렉트에 localhost가 섞이지 않도록 차단
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Public base URL is not configured (NEXT_PUBLIC_SITE_URL or VERCEL_URL required in production)",
    );
  }

  return "http://localhost:3000";
}
