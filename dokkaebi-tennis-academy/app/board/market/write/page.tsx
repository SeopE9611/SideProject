import FreeBoardWriteClient from '@/app/board/market/_components/FreeBoardWriteClient';
import { getCurrentUser } from '@/lib/hooks/get-current-user';
import { redirect } from 'next/navigation';

export const metadata = {
  title: '중고 거래 글쓰기 | 도깨비 테니스',
  // description: '자유 게시판에 테니스 관련 이야기를 작성합니다.',
  alternates: { canonical: '/board/market/write' },
};
// 서버 컴포넌트에서 로그인 여부를 먼저 확인
export default async function FreeBoardWritePage() {
  const user = await getCurrentUser();

  // 비회원이면 로그인 페이지로 보냄
  if (!user) {
    redirect('/login');
  }
  return <FreeBoardWriteClient />;
}
