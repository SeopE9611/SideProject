import { FREE_BOARD_CONFIG } from '@/app/board/_components/board-config';
import FreeBoardClient from '@/app/board/free/_components/FreeBoardClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '자유 게시판 | 테니스 플로우',
  description: '테니스 질문, 연습 일지, 커뮤니티 이야기를 자유롭게 나누는 게시판입니다.',
  alternates: { canonical: '/board/free' },
  openGraph: {
    title: '자유 게시판 | 테니스 플로우',
    description: '테니스 질문, 연습 일지, 커뮤니티 이야기를 자유롭게 나누는 게시판입니다.',
    url: '/board/free',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: '자유 게시판 | 테니스 플로우',
    description: '테니스 질문, 연습 일지, 커뮤니티 이야기를 자유롭게 나누는 게시판입니다.',
  },
};

export default function FreeBoardPage() {
  // 서버 컴포넌트: metadata + 레이아웃 래퍼 역할
  // 실제 데이터 로딩/상호작용은 FreeBoardClient에서 처리
  return <FreeBoardClient config={FREE_BOARD_CONFIG} />;
}
