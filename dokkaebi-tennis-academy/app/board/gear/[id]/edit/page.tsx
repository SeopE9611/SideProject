import FreeBoardEditClient from '@/app/board/gear/[id]/edit/_components/FreeBoardEditClient';

type Props = {
  params: Promise<{ id: string }>;
};

export const metadata = {
  title: '사용기 글 수정 | 도깨비 테니스',
  // description: '자유 게시판에 작성된 글을 수정합니다.',
};

export default async function FreeBoardEditPage({ params }: Props) {
  const { id } = await params;

  return <FreeBoardEditClient id={id} />;
}
