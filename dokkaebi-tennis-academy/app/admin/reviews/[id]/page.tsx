import { getCurrentUser } from '@/lib/hooks/get-current-user';
import AccessDenied from '@/components/system/AccessDenied';
import ReviewDetailClient from '@/app/admin/reviews/[id]/ReviewDetailClient';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ReviewDetailPage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return <AccessDenied />;
  }
  return <ReviewDetailClient reviewId={id} />;
}
