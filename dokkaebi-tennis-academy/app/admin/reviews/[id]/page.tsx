import ReviewDetailClient from '@/app/admin/reviews/[id]/ReviewDetailClient';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ReviewDetailPage({ params }: Props) {
  const { id } = await params;
  return <ReviewDetailClient reviewId={id} />;
}
