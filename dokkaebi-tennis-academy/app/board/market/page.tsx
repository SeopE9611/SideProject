import type { Metadata } from 'next';
import FreeBoardClient from '@/app/board/market/_components/FreeBoardClient';
import { MARKET_BOARD_CONFIG } from '@/app/board/_components/board-config';

export const metadata: Metadata = {
  title: '중고 거래 게시판 | 도깨비 테니스',
  description: '테니스 라켓·스트링·용품 중고 매물 등록과 직거래 정보를 공유하는 게시판입니다.',
  alternates: { canonical: '/board/market' },
  openGraph: {
    title: '중고 거래 게시판 | 도깨비 테니스',
    description: '테니스 라켓·스트링·용품 중고 매물 등록과 직거래 정보를 공유하는 게시판입니다.',
    url: '/board/market',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: '중고 거래 게시판 | 도깨비 테니스',
    description: '테니스 라켓·스트링·용품 중고 매물 등록과 직거래 정보를 공유하는 게시판입니다.',
  },
};

export default function FreeBoardPage() {
  // 서버 컴포넌트: metadata + 레이아웃 래퍼 역할
  // 실제 데이터 로딩/상호작용은 FreeBoardClient에서 처리
  return <FreeBoardClient config={MARKET_BOARD_CONFIG} />;
}
