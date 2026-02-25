import { MARKET_BOARD_CONFIG } from '@/app/board/_components/board-config';
import FreeBoardDetailClient from '@/app/board/market/[id]/_components/FreeBoardDetailClient';

type Props = {
  params: Promise<{ id: string }>;
};

export const metadata = {
  title: '중고 거래 글 상세 | 테니스 플로우',
  // description: '자유 게시판에 작성된 글 상세 내용입니다.',
};

export default async function FreeBoardDetailPage({ params }: Props) {
  const { id } = await params;

  return <FreeBoardDetailClient id={id} config={MARKET_BOARD_CONFIG} />;
}
