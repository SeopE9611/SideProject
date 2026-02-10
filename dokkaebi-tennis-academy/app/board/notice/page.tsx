// 상단 import 추가
import { getBaseUrl } from '@/lib/getBaseUrl';
import NoticeListClient from './_components/NoticeListClient';
import { getBoardList } from '@/lib/boards.queries';
import { getCurrentUser } from '@/lib/hooks/get-current-user';

// ISR(30s): 페이지 단위 캐시
export const revalidate = 30;

// 1) 공지 목록 조회: HTTP가 아니라 DB를 직접 조회
async function fetchNotices() {
  const page = 1;
  const limit = 20;

  try {
    const { items, total } = await getBoardList({
      type: 'notice',
      page,
      limit,
      // 초기 진입은 검색/카테고리/상품 필터 없음
      // q: '',
      // field: 'all',
      // category: null,
      // productId: null,
    });

    return { items, total };
  } catch (error) {
    // 서버 렌더링 시 쿼리 실패해도 전체 페이지가 터지지 않도록 방어
    console.error('Failed to load notices from DB', error);
    return { items: [], total: 0 };
  }
}

// 2) 관리자 여부 조회
async function fetchIsAdmin() {
  const me = await getCurrentUser();
  return me?.role === 'admin';
}

export default async function Page() {
  const [{ items, total }, isAdmin] = await Promise.all([fetchNotices(), fetchIsAdmin()]);

  return <NoticeListClient initialItems={items} initialTotal={total} isAdmin={isAdmin} />;
}
