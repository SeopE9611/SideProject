import FreeBoardClient from '@/app/board/market/_components/FreeBoardClient';

export const metadata = {
  title: '중고 거래 게시판 | 도깨비 테니스',
  // description: '테니스 관련 질문, 정보 공유, 일상 이야기를 나누는 자유 게시판입니다.',
  alternates: { canonical: '/board/market' },
};

export default function FreeBoardPage() {
  // 서버 컴포넌트: metadata + 레이아웃 래퍼 역할
  // 실제 데이터 로딩/상호작용은 FreeBoardClient에서 처리
  return <FreeBoardClient />;
}
