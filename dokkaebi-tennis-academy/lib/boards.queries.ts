// lib/boards.queries.ts
import { getDb } from '@/lib/mongodb';
import type { BoardType } from '@/lib/types/board';
import type { Sort } from 'mongodb';

/**
 * 게시판 목록 아이템 타입
 * - NoticeListClient / QnaListClient 등에서 사용하는 필드 위주로 정리
 */
export type BoardListItem = {
  _id: string;
  title: string;
  createdAt: Date;
  viewCount: number;
  isPinned?: boolean;
  category?: string | null;

  // 첨부 메타 정보
  attachmentsCount?: number;
  imagesCount?: number;
  filesCount?: number;
  hasImage?: boolean;
  hasFile?: boolean;
};

/**
 * 게시판 목록 조회 파라미터
 * - /api/boards GET 쿼리와 1:1로 매핑 가능하게 설계
 */
export type BoardListParams = {
  type: BoardType; // 'notice' | 'qna'
  page: number; // 1부터 시작
  limit: number; // 페이지당 개수

  // 검색
  q?: string;
  field?: 'all' | 'title' | 'content' | 'title_content';

  // 필터
  category?: string | null;
  productId?: string | null;
};

/**
 * 공통 게시판 목록 조회
 * - 서버 컴포넌트 / API 라우트 양쪽에서 재사용
 * - HTTP 없이 MongoDB에서 바로 읽는다.
 */
export async function getBoardList(params: BoardListParams): Promise<{ items: BoardListItem[]; total: number }> {
  const { type, page, limit, q = '', field = 'all', category, productId } = params;

  const db = await getDb();
  const col = db.collection('board_posts');

  // 1) 기본 필터: 게시판 타입 + 게시 상태
  const filter: Record<string, any> = {
    type,
    status: 'published',
  };

  // 2) 카테고리 필터
  if (category) {
    filter.category = category;
  }

  // 3) 상품 필터 (QnA 전용)
  if (productId) {
    filter['productRef.productId'] = productId;
  }

  // 4) 검색어 필터
  if (q && q.trim()) {
    const keyword = q.trim();

    // 정규식 특수문자 escape
    const esc = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(esc(keyword), 'i');

    if (field === 'title') {
      filter.title = { $regex: re };
    } else if (field === 'content') {
      filter.content = { $regex: re };
    } else {
      // all / title_content → 제목+내용 OR 검색
      filter.$or = [{ title: { $regex: re } }, { content: { $regex: re } }];
    }
  }

  // 5) total (페이지네이션용 전체 개수)
  const total = await col.countDocuments(filter);

  // 6) 정렬 조건
  const sort: Sort = { createdAt: -1 };
  if (type === 'notice') {
    // 공지는 상단 고정(isPinned) 우선
    (sort as any).isPinned = -1;
  }

  // 7) 실제 목록 조회
  const rawItems = await col
    .find(filter, {
      projection: {
        title: 1,
        createdAt: 1,
        viewCount: 1,
        isPinned: 1,
        category: 1,
        attachments: 1,
      },
    })
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(limit)
    .toArray();

  // 8) 첨부 메타 계산 (이미지 / 파일 개수)
  const items: BoardListItem[] = rawItems.map((doc: any) => {
    const attachments = Array.isArray(doc.attachments) ? doc.attachments : [];

    const isImage = (a: any) => {
      const mime = (a?.mime as string | undefined) ?? '';
      const url = (a?.url as string | undefined) ?? '';
      const byMime = /^image\//i.test(mime);
      const byExt = /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(url);
      return byMime || byExt;
    };

    const imageAttachments = attachments.filter((a: any) => isImage(a));
    const fileAttachments = attachments.filter((a: any) => !isImage(a));

    return {
      _id: String(doc._id),
      title: doc.title ?? '',
      createdAt: doc.createdAt ?? new Date(),
      viewCount: doc.viewCount ?? 0,
      isPinned: !!doc.isPinned,
      category: doc.category ?? null,
      attachmentsCount: attachments.length,
      imagesCount: imageAttachments.length,
      filesCount: fileAttachments.length,
      hasImage: imageAttachments.length > 0,
      hasFile: fileAttachments.length > 0,
    };
  });

  // 여기서 반드시 값 반환 → TS2355 방지
  return { items, total };
}
