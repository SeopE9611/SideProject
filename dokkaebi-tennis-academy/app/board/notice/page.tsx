import { getBaseUrl } from '@/lib/getBaseUrl';
import NoticeListClient from './_components/NoticeListClient';

// ISR(30s): 페이지 단위 캐시
export const revalidate = 30;

async function fetchNotices() {
  const qs = new URLSearchParams({ type: 'notice', page: '1', limit: '20' });
  // 서버에서 /api 호출 시 상대 경로는 안 됨 -> 절대 URL 필요할 때는 NEXT_PUBLIC_SITE_URL 등을 쓰고,
  // 여기서는 RSC라서 직접 DB를 물어보지 않는 이상 아래처럼 내부 fetch 허용.
  const res = await fetch(`${getBaseUrl()}/api/boards?${qs.toString()}`, {
    // 목록은 ISR이므로 기본 force-cache, next.revalidate를 함께 명시해도 OK
    next: { revalidate: 30 },
    headers: { cookie: '' }, // 공개 목록이므로 쿠키 필요 없음
  });
  const json = await res.json();
  return {
    items: json?.items ?? [],
    total: json?.total ?? 0,
  };
}

async function fetchIsAdmin() {
  // 관리자 여부는 SSR에서 쿠키 포함해도 되지만,
  // 공지 목록 공개 페이지라 쿠키 없이 false 기본값 권장
  // (상단 "작성하기" 버튼 노출 제어용)
  try {
    const res = await fetch(`${getBaseUrl()}/api/users/me`, { cache: 'no-store' });
    const me = await res.json();
    return me?.role === 'admin' || me?.isAdmin === true || (Array.isArray(me?.roles) && me.roles.includes('admin'));
  } catch {
    return false;
  }
}

export default async function Page() {
  const [{ items, total }, isAdmin] = await Promise.all([fetchNotices(), fetchIsAdmin()]);

  return <NoticeListClient initialItems={items} initialTotal={total} isAdmin={isAdmin} />;
}
