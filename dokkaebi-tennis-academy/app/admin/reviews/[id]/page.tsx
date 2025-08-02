import { getCurrentUser } from '@/lib/hooks/get-current-user';
import AccessDenied from '@/components/system/AccessDenied';
import ReviewDetailClient from '@/app/admin/reviews/[id]/ReviewDetailClient';

interface Props {
  params: { id: string };
}

export default async function ReviewDetailPage({ params: { id } }: Props) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return <AccessDenied />;
  }
  return <ReviewDetailClient reviewId={id} />;
}
