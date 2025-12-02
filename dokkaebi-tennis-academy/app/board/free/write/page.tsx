import FreeBoardWriteClient from '@/app/board/free/_components/FreeBoardWriteClient';

export const metadata = {
  title: '자유 게시판 글쓰기 | 도깨비 테니스',
  description: '자유 게시판에 테니스 관련 이야기를 작성합니다.',
  alternates: { canonical: '/board/free/write' },
};

export default function FreeBoardWritePage() {
  return <FreeBoardWriteClient />;
}
