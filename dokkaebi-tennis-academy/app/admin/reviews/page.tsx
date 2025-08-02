import { getCurrentUser } from '@/lib/hooks/get-current-user';
import AccessDenied from '@/components/system/AccessDenied';
import ReviewsClient from '@/app/admin/reviews/ReviewsClient';

export default async function ReviewsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return <AccessDenied />;
  }
  return <ReviewsClient />;
}
