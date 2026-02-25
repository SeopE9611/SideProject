import { getBoardList } from '@/lib/boards.queries';
import type { Metadata } from 'next';
import QnaPageClient from './_components/QnaPageClient';

export const metadata: Metadata = {
  title: 'Q&A 게시판 | 테니스 플로우',
  description: '상품, 주문, 배송, 환불 등 고객 문의와 답변을 확인할 수 있는 Q&A 게시판입니다.',
  alternates: { canonical: '/board/qna' },
  openGraph: {
    title: 'Q&A 게시판 | 테니스 플로우',
    description: '상품, 주문, 배송, 환불 등 고객 문의와 답변을 확인할 수 있는 Q&A 게시판입니다.',
    url: '/board/qna',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Q&A 게시판 | 테니스 플로우',
    description: '상품, 주문, 배송, 환불 등 고객 문의와 답변을 확인할 수 있는 Q&A 게시판입니다.',
  },
};

export const revalidate = 30;

const CODE_TO_LABEL: Record<string, string> = {
  product: '상품문의',
  order: '주문/결제',
  delivery: '배송',
  refund: '환불/교환',
  service: '서비스',
  academy: '아카데미',
  member: '회원',
};

const LABEL_TO_CODE: Record<string, string> = Object.fromEntries(Object.entries(CODE_TO_LABEL).map(([k, v]) => [v, k]));

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

function parsePositiveInt(v: string | undefined, fallback: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  const i = Math.floor(n);
  return i >= 1 ? i : fallback;
}

export default async function Page({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const resolvedSearchParams = await searchParams;
  const limit = 20;

  // 1) URL → 초기 상태로 파싱
  const page = parsePositiveInt(first(resolvedSearchParams?.page), 1);

  const rawCategory = first(resolvedSearchParams?.category); // code(예: product) 또는 label(예: 상품문의) 모두 올 수 있음
  const initialCategory = (rawCategory && (rawCategory in CODE_TO_LABEL ? rawCategory : LABEL_TO_CODE[rawCategory])) || 'all';

  const rawAnswer = first(resolvedSearchParams?.answer);
  const initialAnswerFilter = rawAnswer === 'waiting' || rawAnswer === 'completed' ? rawAnswer : 'all';

  const initialKeyword = first(resolvedSearchParams?.q) ?? '';

  const rawField = first(resolvedSearchParams?.field);
  const allowedFields = new Set(['all', 'title', 'content', 'title_content'] as const);
  const initialField = (rawField && allowedFields.has(rawField as any) ? (rawField as any) : 'all') as 'all' | 'title' | 'content' | 'title_content';

  // 2) DB 프리로드 파라미터 구성 (getBoardList는 "라벨" 카테고리를 기대)
  const categoryLabel = initialCategory !== 'all' ? (CODE_TO_LABEL[initialCategory] ?? null) : null;
  const answerParam = initialAnswerFilter === 'all' ? null : initialAnswerFilter;

  // 3) 서버 프리로드 (실패해도 페이지 전체가 죽지 않게 방어)
  // try/catch 안에서는 "데이터"만 만들고, JSX는 밖에서 한 번만 return
  let initialItems: any[] = [];
  let initialTotal = 0;

  try {
    const res = await getBoardList({
      type: 'qna',
      page,
      limit,
      category: categoryLabel,
      q: initialKeyword.trim() ? initialKeyword.trim() : '',
      field: initialField,
      answer: answerParam,
    });
    initialItems = res.items;
    initialTotal = res.total;
  } catch (e) {
    console.error('Failed to preload QnA list', e);
  }

  return <QnaPageClient initialItems={initialItems} initialTotal={initialTotal} initialPage={page} initialCategory={initialCategory} initialAnswerFilter={initialAnswerFilter} initialKeyword={initialKeyword} initialField={initialField} />;
}
