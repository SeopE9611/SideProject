import ShippingFormClient from '@/app/admin/applications/stringing/[id]/shipping-update/ShippingFormClient';
import AccessDenied from '@/components/system/AccessDenied';
import { getCurrentUser } from '@/lib/hooks/get-current-user';

export default async function ShippingUpdatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return <AccessDenied />;
  }

  return <ShippingFormClient applicationId={id} />;
}
