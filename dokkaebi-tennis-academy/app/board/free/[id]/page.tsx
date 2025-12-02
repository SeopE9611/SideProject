import FreeBoardDetailClient from '@/app/board/free/[id]/_components/FreeBoardDetailClient';

type Props = {
  params: Promise<{ id: string }>;
};

export const metadata = {
  title: '자유 게시판 글 상세 | 도깨비 테니스',
  description: '자유 게시판에 작성된 글 상세 내용입니다.',
};

export default async function FreeBoardDetailPage({ params }: Props) {
  const { id } = await params;

  return <FreeBoardDetailClient id={id} />;
}
