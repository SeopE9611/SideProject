import { GEAR_BOARD_CONFIG } from '@/app/board/_components/board-config';
import FreeBoardClient from '@/app/board/gear/_components/FreeBoardClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '사용기 게시판 | 테니스 플로우',
  description: '라켓 시타기, 스트링 세팅 후기, 장비 실사용 경험을 공유하는 게시판입니다.',
  alternates: { canonical: '/board/gear' },
  openGraph: {
    title: '사용기 게시판 | 테니스 플로우',
    description: '라켓 시타기, 스트링 세팅 후기, 장비 실사용 경험을 공유하는 게시판입니다.',
    url: '/board/gear',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: '사용기 게시판 | 테니스 플로우',
    description: '라켓 시타기, 스트링 세팅 후기, 장비 실사용 경험을 공유하는 게시판입니다.',
  },
};

export default function FreeBoardPage() {
  // 서버 컴포넌트: metadata + 레이아웃 래퍼 역할
  // 실제 데이터 로딩/상호작용은 FreeBoardClient에서 처리
  return <FreeBoardClient config={GEAR_BOARD_CONFIG} />;
}
