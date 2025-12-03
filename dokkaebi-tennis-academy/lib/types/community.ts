/** 커뮤니티 글 노출 상태 */
export type CommunityStatus = 'public' | 'hidden' | 'deleted';

/** 커뮤니티 게시판 종류 목록 */
export const COMMUNITY_BOARD_TYPES = ['free', 'brand'] as const;

/** 커뮤니티 게시판 종류 타입 */
export type CommunityBoardType = (typeof COMMUNITY_BOARD_TYPES)[number];

/** 자유 게시판 카테고리 목록 (제목 머릿말 용) */
export const COMMUNITY_CATEGORIES = ['general', 'info', 'qna', 'etc'] as const;

/** 자유 게시판 카테고리 타입 */
export type CommunityCategory = (typeof COMMUNITY_CATEGORIES)[number];

/**
 * API 응답/프론트에서 사용하는 커뮤니티 게시글 타입
 * - DB에서는 community_posts 컬렉션에 저장
 * - createdAt/updatedAt 는 ISO 문자열로 내려줌
 */
export interface CommunityPost {
  /** MongoDB _id 문자열 */
  id: string;

  /** 게시판 종류 (자유/브랜드 등) */
  type: CommunityBoardType;

  /** 글 제목 */
  title: string;

  /** 글 본문 */
  content: string;

  /**
   * 브랜드 게시판에서 사용할 브랜드 코드
   * 자유 게시판에서는 null 또는 undefined
   */
  brand?: string | null;

  /**
   * 게시판 내 노출용 글 번호
   * - 인벤처럼 1, 2, 3 또는 5951889 같이 증가하는 번호
   * - 아직 DB에는 안 쓰고, 후에 시퀀스 컬렉션 도입 시 사용 예정
   */
  postNo?: number;

  /**
   * 글 카테고리 (제목 머릿말)
   * - 예: 'general'(자유), 'info'(정보), 'qna'(질문), 'etc'(잡담)
   */
  category?: CommunityCategory;

  /**
   * 첨부 이미지 URL 목록
   * - 이후 업로드 기능 붙일 때 사용
   */
  images?: string[];

  // ---------------------------------------------------------------------------
  // 작성자 정보
  // ---------------------------------------------------------------------------

  /** 회원이면 user _id, 비회원/익명이면 null */
  userId?: string | null;

  /** 화면에 보여줄 작성자 표시명 (기존 필드, 하위 호환용) */
  nickname: string;

  /** users 컬렉션에서 가져온 실제 이름 (추후 사용) */
  authorName?: string;

  /** 동명이인 구분을 위한 이메일 (마스킹 전용) */
  authorEmail?: string;

  // ---------------------------------------------------------------------------
  // 상태/메타 정보
  // ---------------------------------------------------------------------------

  status: CommunityStatus; // 'public' | 'hidden' | 'deleted'
  views: number; // 조회수
  likes: number; // 추천/좋아요 수
  commentsCount: number; // 댓글 수

  // ---------------------------------------------------------------------------
  // 시간 정보
  // ---------------------------------------------------------------------------

  createdAt: string; // ISO 문자열
  updatedAt?: string; // ISO 문자열(수정 시)
}
