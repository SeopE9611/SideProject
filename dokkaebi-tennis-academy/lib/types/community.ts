/** 커뮤니티 글 노출 상태 */
export type CommunityStatus = 'public' | 'hidden' | 'deleted';

/** 커뮤니티 게시판 종류 목록 */
export const COMMUNITY_BOARD_TYPES = ['free', 'brand', 'market', 'gear'] as const;

/** 커뮤니티 게시판 종류 타입 */
export type CommunityBoardType = (typeof COMMUNITY_BOARD_TYPES)[number];

/** 자유 게시판 카테고리 목록 (제목 머릿말 용) */
export const COMMUNITY_CATEGORIES = ['general', 'info', 'qna', 'tip', 'etc', 'racket', 'string', 'equipment', 'shoes', 'bag', 'apparel', 'grip', 'accessory', 'ball', 'other'] as const;

/** 자유 게시판 카테고리 타입 */
export type CommunityCategory = (typeof COMMUNITY_CATEGORIES)[number];

// 파일 메타 타입
export type CommunityAttachment = {
  name: string; // 원본 파일명
  url: string; // Supabase에 업로드된 파일 URL
  size?: number; // 파일 크기
};
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
   * 브랜드 코드
   * - 브랜드 게시판/중고거래 게시판에서 사용
   * - 그 외 게시판에서는 null 또는 undefined
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

  // 첨부 파일
  attachments?: CommunityAttachment[];

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

  /** 현재 로그인 사용자가 이 글에 좋아요를 눌렀는지 여부 (비로그인/미추천 시 false 또는 undefined) */
  likedByMe?: boolean;

  // ---------------------------------------------------------------------------
  // 시간 정보
  // ---------------------------------------------------------------------------

  createdAt: string; // ISO 문자열
  updatedAt?: string; // ISO 문자열(수정 시)
}

export interface CommunityComment {
  /** 댓글 고유 ID (ObjectId 문자열) */
  id: string;

  /** 어느 글에 달린 댓글인지 (CommunityPost.id) */
  postId: string;

  /**
   * 부모 댓글 ID
   * - 루트 댓글: null
   * - 대댓글: 부모 댓글의 id (CommunityComment.id)
   */
  parentId: string | null;

  /** 작성자 유저 ID (로그인 기반, 비회원 허용 시 null 가능) */
  userId: string | null;

  /** 표시용 닉네임 (users.name / nickname / 이메일 앞부분 중 하나) */
  nickname: string;

  /** 실제 이름 스냅샷 - 추후 운영/관리용으로 확장 가능 */
  authorName?: string;

  /** 이메일 스냅샷 - 동명이인 구분용 */
  authorEmail?: string;

  /** 댓글 본문 */
  content: string;

  /** 노출 상태 - 기본은 'public' */
  status: CommunityStatus;

  /** 생성 시각 (ISO 문자열) */
  createdAt: string;

  /** 수정 시각 (ISO 문자열) */
  updatedAt?: string;
}

/** 신고 처리 상태 */
export type CommunityReportStatus = 'pending' | 'reviewed' | 'ignored';

/** 커뮤니티 게시글 신고 데이터 타입 (API 응답용) */
export interface CommunityReport {
  /** MongoDB _id 문자열 */
  id: string;

  /** 신고 대상 게시글 _id */
  postId: string;

  /** 게시판 종류 (free | brand 등) */
  boardType: CommunityBoardType;

  /** 신고 사유 */
  reason: string;

  /** 신고 처리 상태 */
  status: CommunityReportStatus;

  /** 신고자(회원) ID - 비회원이면 undefined */
  reporterUserId?: string;

  /** 신고자 이메일 스냅샷 (선택) */
  reporterEmail?: string;

  /** 생성 시각 (ISO 문자열) */
  createdAt: string;

  /** 처리 완료 시각 (ISO 문자열, 선택) */
  resolvedAt?: string;
}
