// 상단 import 추가
import { getBaseUrl } from '@/lib/getBaseUrl';
import NoticeListClient from './_components/NoticeListClient';
import { getBoardList } from '@/lib/boards.queries';
import { getCurrentUser } from '@/lib/hooks/get-current-user';

// ISR(30s): 페이지 단위 캐시
export const revalidate = 30;

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

// 1) 공지 목록 조회: HTTP가 아니라 DB를 직접 조회
async function fetchNotices(opts: { page: number; limit: number; q: string; field: 'all' | 'title' | 'content' | 'title_content' }) {
  const { page, limit, q, field } = opts;

  try {
    const { items, total } = await getBoardList({
      type: 'notice',
      page,
      limit,
      // URL 쿼리(검색/필드)를 서버 프리로드에도 동일하게 반영
      q,
      field,
      // 카테고리/상품 필터는 현재 공지 UI에서 사용하지 않으므로 제외
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

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  // URL 쿼리로 직접 진입하는 케이스(/board/notice?page=3&q=...&field=title 등)에서
  // 서버 프리로드가 항상 page=1로 뜨는 문제를 방지
  const pick = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

  const resolvedSearchParams = await searchParams;

  const rawPage = pick(resolvedSearchParams?.page);
  const rawQ = pick(resolvedSearchParams?.q) ?? '';
  const rawField = pick(resolvedSearchParams?.field) ?? 'all';

  const page = clamp(Number.parseInt(String(rawPage ?? '1'), 10) || 1, 1, 10_000);
  const limit = 20;

  const field: 'all' | 'title' | 'content' | 'title_content' =
    rawField === 'title' || rawField === 'content' || rawField === 'title_content' ? rawField : 'all';

  const q = rawQ;

  const [{ items, total }, isAdmin] = await Promise.all([
    fetchNotices({ page, limit, q, field }),
    fetchIsAdmin(),
  ]);

  return (
    <NoticeListClient
      initialItems={items}
      initialTotal={total}
      isAdmin={isAdmin}
      initialPage={page}
      initialKeyword={q}
      initialField={field}
    />
  );
 }
