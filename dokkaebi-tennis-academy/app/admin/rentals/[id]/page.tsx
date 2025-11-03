import AdminRentalDetailClient from '@/app/admin/rentals/[id]/_components/AdminRentalDetailClient';

export const dynamic = 'force-dynamic';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <AdminRentalDetailClient />;
}
