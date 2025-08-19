import AdminReviewMaintenancePanel from '@/app/admin/reviews/_components/AdminReviewMaintenancePanel';
import ReviewsClient from '@/app/admin/reviews/ReviewsClient';

export default async function ReviewsPage() {
  return (
    <div className="p-6 space-y-6">
      <AdminReviewMaintenancePanel />
      <ReviewsClient />
    </div>
  );
}
