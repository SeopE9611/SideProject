// 상단 import 추가
import { getBaseUrl } from '@/lib/getBaseUrl';
import NoticeListClient from './_components/NoticeListClient';

// ISR(30s): 페이지 단위 캐시
export const revalidate = 30;

// 1) 공지 목록 조회
async function fetchNotices() {
  const qs = new URLSearchParams({ type: 'notice', page: '1', limit: '20' });

  // 절대 URL 생성
  const baseUrl = getBaseUrl();

  const res = await fetch(`${baseUrl}/api/boards?${qs.toString()}`, {
    next: { revalidate: 30 },
  });

  if (!res.ok) {
    throw new Error('공지 목록을 불러오지 못했습니다.');
  }

  const data = await res.json();
  return {
    items: data.items ?? [],
    total: data.total ?? 0,
  };
}

// 2) 관리자 여부 조회: cache: 'no-store' 동적 페이지로 처리됨
async function fetchIsAdmin() {
  try {
    const res = await fetch('/api/users/me', {
      cache: 'no-store',
      // 여기서는 쿠키를 자동으로 Next가 전달해줌 (요청 컨텍스트 기반)
    });

    if (!res.ok) return false;

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
