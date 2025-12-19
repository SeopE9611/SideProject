import FreeBoardClient from '@/app/board/gear/_components/FreeBoardClient';

export const metadata = {
  title: '사용기 게시판 | 도깨비 테니스',
  description: '라켓 시타기, 제품 사용기 등 자유롭게 작성하는 게시판입니다.',
  alternates: { canonical: '/board/gear' },
};

export default function FreeBoardPage() {
  // 서버 컴포넌트: metadata + 레이아웃 래퍼 역할
  // 실제 데이터 로딩/상호작용은 FreeBoardClient에서 처리
  return <FreeBoardClient />;
}
