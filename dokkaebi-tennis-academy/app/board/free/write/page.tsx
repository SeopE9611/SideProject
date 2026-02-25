import FreeBoardWriteClient from '@/app/board/free/_components/FreeBoardWriteClient';
import { getCurrentUser } from '@/lib/hooks/get-current-user';
import { redirect } from 'next/navigation';

export const metadata = {
  title: '자유 게시판 글쓰기 | 테니스 플로우',
  description: '자유 게시판에 테니스 관련 이야기를 작성합니다.',
  alternates: { canonical: '/board/free/write' },
};
// 서버 컴포넌트에서 로그인 여부를 먼저 확인
export default async function FreeBoardWritePage() {
  const user = await getCurrentUser();

  // 비회원이면 로그인 페이지로 보냄
  if (!user) {
    const target = '/board/free/write';
    redirect(`/login?redirectTo=${encodeURIComponent(target)}`);
  }
  return <FreeBoardWriteClient />;
}
