import NoticeListClient from './_components/NoticeListClient';

// ISR(30s): 페이지 단위 캐시
export const revalidate = 30;

// 1) 공지 목록 조회: 내부 API는 상대 경로 사용
async function fetchNotices() {
  const qs = new URLSearchParams({ type: 'notice', page: '1', limit: '20' });

  //  상대 경로로 호출하면 Next가 내부 라우팅을 사용하므로
  //    빌드 시점에도 localhost:3000으로 네트워크 요청을 안 보냄
  const res = await fetch(`/api/boards?${qs.toString()}`, {
    next: { revalidate: 30 },
    // 빌드/ISR 단계에선 원래 쿠키가 없으니 굳이 비우는 헤더 지정도 불필요
    // headers: { cookie: '' },
  });

  if (!res.ok) {
    // 빌드시 에러 터지면 빈 목록으로라도 방어 (선택)
    console.error('Failed to fetch notices', res.status, res.statusText);
    return { items: [], total: 0 };
  }

  const json = await res.json();
  return {
    items: json?.items ?? [],
    total: json?.total ?? 0,
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
