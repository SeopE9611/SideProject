/**
 * 게시판 공용 타입 정의
 * - 단일 컬렉션(board_posts)에 공지/문의(QnA)를 함께 저장
 * - QnA는 category(아래 라벨 집합) + productRef(선택)로 세분화
 *   카테고리 라벨(한글): '일반문의' | '상품문의' | '주문/결제' | '배송' | '환불/교환' | '서비스' | '아카데미' | '회원'
 */
import type { BoardAttachment, BoardPostBase } from '@/lib/types/board-domain';

export type BoardType = 'notice' | 'qna';
export type QnaCategory = '일반문의' | '상품문의' | '주문/결제' | '배송' | '환불/교환' | '서비스' | '아카데미' | '회원';
export type BoardStatus = 'published' | 'hidden' | 'deleted';

export interface ProductRef {
  productId: string; // ObjectId 문자열(문자열 유지)
  name?: string; // 상품명 스냅샷(리스트 빠른 렌더용)
  image?: string | null; // 대표 이미지 URL 스냅샷
}

export interface BoardAnswer {
  content: string; // 관리자 답변 본문(MD/Plain)
  authorId: string; // admin user id
  authorName?: string; // 표시용 스냅샷
  createdAt: Date;
  updatedAt?: Date;
}

export interface BoardPost extends Omit<BoardPostBase, 'kind'> {
  type: BoardType; // 'notice' | 'qna'
  title: string;
  content: string; // 본문(비밀글일 경우 상세 응답에서 마스킹 처리)

  // QnA 전용 필드
  category?: QnaCategory; // 라벨(한글) 기준: 위 QnaCategory 참조
  productRef?: ProductRef; // 상품문의일 때만
  answer?: BoardAnswer | null; // 관리자 1:1 답변(초기 1개만)
  isSecret?: boolean; // 비밀글(작성자/관리자만 본문/첨부 볼 수 있음)

  // 공통 메타
  authorId: string; // 공지: admin / QnA: user
  authorName?: string; // 표시용 스냅샷
  status: BoardStatus; // 'published' | 'hidden' | 'deleted'
  isPinned?: boolean; // 공지 상단 고정
  attachments?: BoardAttachment[];
}
