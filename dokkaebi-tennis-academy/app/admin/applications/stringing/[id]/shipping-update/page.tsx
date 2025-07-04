import ShippingFormClient from '@/app/admin/applications/stringing/[id]/shipping-update/ShippingFormClient';

export default async function ShippingUpdatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ShippingFormClient applicationId={id} />;
}
