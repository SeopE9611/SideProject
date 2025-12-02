/** 커뮤니티 글 노출 상태 */
export type CommunityStatus = 'public' | 'hidden' | 'deleted';

/** 커뮤니티 게시판 종류 목록 */
export const COMMUNITY_BOARD_TYPES = ['free', 'brand'] as const;

/** 커뮤니티 게시판 종류 타입 */
export type CommunityBoardType = (typeof COMMUNITY_BOARD_TYPES)[number];

/**
 * API 응답/프론트에서 사용하는 커뮤니티 게시글 타입
 * - DB에서는 community_posts 컬렉션에 저장
 * - createdAt/updatedAt 는 ISO 문자열로 내려줌
 */
export interface CommunityPost {
  id: string; // MongoDB _id 문자열

  // 기본 분류
  type: CommunityBoardType; // 'free' | 'brand'

  // 제목/내용
  title: string;
  content: string;

  // 브랜드 게시판 전용 필드(자유 게시판은 대부분 undefined/null)
  brand?: string | null;

  // 작성자 정보
  userId?: string | null; // 회원이면 user _id 문자열, 비회원/익명이면 null
  nickname: string; // 화면에 보여줄 작성자 표시명

  // 상태/메타 정보
  status: CommunityStatus; // 'public' | 'hidden' | 'deleted'
  views: number; // 조회수
  likes: number; // 좋아요(추후 사용)
  commentsCount: number; // 댓글 수(추후 댓글 기능 연동)

  // 시간 정보
  createdAt: string; // ISO 문자열
  updatedAt?: string; // ISO 문자열(수정 시)
}
